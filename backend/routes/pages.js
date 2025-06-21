// backend/routes/pages.js - Versão atualizada com rota criar-projeto
const express = require('express');
const router = express.Router();
const { authPage } = require('../middleware/auth');
const { requireAuth, requireDeveloper } = require('../middleware/requireAuth');
const { register, login } = require('../controllers/authController');
const Project = require('../models/Project');
const mongoose = require('mongoose');

// Página inicial
router.get('/', (req, res) => {
  res.render('index', {
    title: 'IncubePro - Conectando Desenvolvedores e Investidores'
  });
});

// Página de destaques (cases de sucesso)
router.get('/destaques', (req, res) => {
  res.render('destaques', {
    title: 'Cases de Sucesso - IncubePro'
  });
});

// Página de projetos em andamento (antes do login)
router.get('/projetos', (req, res) => {
  res.render('projetos', {
    title: 'Projetos em Andamento - IncubePro'
  });
});

// Página de login
router.get('/login', (req, res) => {
  const registered = req.query.registered === 'true';
  res.render('login', {
    title: 'Login - IncubePro',
    registered,
    error: req.query.error === 'expired' ? 'Sua sessão expirou. Por favor, faça login novamente.' : null
  });
});

// Processar formulário de login
router.post('/login', login);

// Página de registro
router.get('/register', (req, res) => {
  // Pegar o papel (role) da query string, se existir
  const role = req.query.role || 'developer';
  res.render('register', {
    title: 'Registro - IncubePro',
    role
  });
});

// Processar formulário de registro
router.post('/register', register);

// Logout
router.get('/logout', (req, res) => {
  // Limpar o cookie de token com as mesmas opções usadas na criação
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/' // Importante: especificar o path
  });

  // Também limpar outros cookies relacionados, se existirem
  res.clearCookie('refreshToken');

  // Redirecionar para login
  res.redirect('/login');
});

// IMPORTANTE: Rotas específicas ANTES da rota com parâmetro dinâmico (:id)

// Rota para criar novo projeto - PRINCIPAL (protegida)
router.get('/criar-projeto', requireDeveloper, (req, res) => {
  res.render('criar-projeto', {
    title: 'Criar Novo Projeto - IncubePro'
  });
});

// Rota para criar novo projeto (protegida) - alternativa
router.get('/projects/new', requireDeveloper, (req, res) => {
  res.render('criar-projeto', {
    title: 'Criar Novo Projeto - IncubePro'
  });
});

// Rota alternativa para criar projeto - redireciona para a principal
router.get('/new-project', requireDeveloper, (req, res) => {
  res.redirect('/criar-projeto');
});

// Rota para detalhes de um projeto específico
router.get('/projects/:id', (req, res) => {
  res.render('project-detail', {
    title: 'Detalhes do Projeto - IncubePro',
    projectId: req.params.id
  });
});

// Rota alternativa para detalhes do projeto
router.get('/projeto/:id', (req, res) => {
  res.render('project-detail', {
    title: 'Detalhes do Projeto - IncubePro',
    projectId: req.params.id
  });
});

// Rota para perfil do usuário (protegida)
router.get('/profile', requireAuth, (req, res) => {
  res.render('profile', {
    title: 'Meu Perfil - IncubePro'
  });
});

// Rota para "Meus Projetos" - apenas para usuários logados
router.get('/meus-projetos', requireAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9; // 9 projetos por página (3x3 grid)
    const skip = (page - 1) * limit;

    // Construir filtros para projetos do usuário logado
    const filters = { creator: req.user.id };

    // Filtros adicionais
    if (req.query.status) {
      filters.status = req.query.status;
    }

    if (req.query.category) {
      filters.category = req.query.category;
    }

    if (req.query.search) {
      filters.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Definir ordenação
    let sortBy = { createdAt: -1 }; // Padrão: mais recentes primeiro

    if (req.query.sortBy) {
      switch (req.query.sortBy) {
        case 'title':
          sortBy = { title: 1 };
          break;
        case 'fundingGoal':
          sortBy = { fundingGoal: -1 };
          break;
        case 'currentFunding':
          sortBy = { currentFunding: -1 };
          break;
        case 'oldest':
          sortBy = { createdAt: 1 };
          break;
        default:
          sortBy = { createdAt: -1 };
      }
    }

    // Buscar projetos do usuário
    const projects = await Project.find(filters)
      .populate('creator', 'name email role avatar')
      .skip(skip)
      .limit(limit)
      .sort(sortBy);

    // Contar total de projetos
    const total = await Project.countDocuments(filters);

    // Calcular estatísticas do usuário
    const stats = {
      total: total,
      conceito: await Project.countDocuments({ ...filters, status: 'Conceito' }),
      emAndamento: await Project.countDocuments({ ...filters, status: 'Em andamento' }),
      beta: await Project.countDocuments({ ...filters, status: 'Versão beta' }),
      lancado: await Project.countDocuments({ ...filters, status: 'No ar (lançado)' })
    };

    // Calcular totais financeiros
    const financialStats = await Project.aggregate([
      { $match: { creator: new mongoose.Types.ObjectId(req.user.id) } },
      {
        $group: {
          _id: null,
          totalFundingGoal: { $sum: '$fundingGoal' },
          totalCurrentFunding: { $sum: '$currentFunding' }
        }
      }
    ]);

    const financial = financialStats[0] || { totalFundingGoal: 0, totalCurrentFunding: 0 };

    // Metadados de paginação
    const pagination = {
      current: page,
      pages: Math.ceil(total / limit),
      total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    };

    // Obter categorias e status únicos para filtros
    const categories = await Project.distinct('category');
    const statuses = await Project.distinct('status');

    res.render('meus-projetos', {
      title: 'Meus Projetos - IncubePro',
      projects,
      stats,
      financial,
      pagination,
      categories,
      statuses,
      currentFilters: {
        status: req.query.status || '',
        category: req.query.category || '',
        search: req.query.search || '',
        sortBy: req.query.sortBy || 'newest'
      }
    });

  } catch (error) {
    console.error('Erro ao carregar meus projetos:', error);
    res.status(500).render('error', {
      title: 'Erro - IncubePro',
      error: process.env.NODE_ENV === 'development' ? error : null,
      message: 'Erro ao carregar seus projetos'
    });
  }
});

// Rota para editar projeto (protegida - apenas criador do projeto)
router.get('/editar-projeto/:id', requireAuth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).render('error', {
        title: 'Projeto não encontrado - IncubePro',
        message: 'O projeto solicitado não foi encontrado.'
      });
    }

    // Verificar se o usuário é o criador do projeto
    if (project.creator.toString() !== req.user.id) {
      return res.status(403).render('error', {
        title: 'Acesso Negado - IncubePro',
        message: 'Você não tem permissão para editar este projeto.'
      });
    }

    res.render('edit-project', {
      title: 'Editar Projeto - IncubePro',
      project
    });

  } catch (error) {
    console.error('Erro ao carregar projeto para edição:', error);
    res.status(500).render('error', {
      title: 'Erro - IncubePro',
      error: process.env.NODE_ENV === 'development' ? error : null,
      message: 'Erro ao carregar projeto para edição'
    });
  }
});

module.exports = router;