const express = require('express');
const router = express.Router();
const { authPage } = require('../middleware/auth');
const { register, login } = require('../controllers/authController');

// Página inicial
router.get('/', (req, res) => {
  res.render('index', {
    title: 'IncubePro - Conectando Desenvolvedores e Investidores'
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

// Rota para visualizar todos os projetos
router.get('/projects', (req, res) => {
  res.render('projects', {
    title: 'Projetos - IncubePro'
  });
});

// IMPORTANTE: Rotas específicas ANTES da rota com parâmetro dinâmico (:id)
// Rota para criar novo projeto (protegida)
router.get('/projects/new', authPage, (req, res) => {
  // Verificar se o usuário é developer
  if (req.user.role !== 'developer') {
    return res.redirect('/');
  }

  res.render('new-project', {
    title: 'Criar Novo Projeto - IncubePro'
  });
});

// Rota para detalhes de um projeto específico
router.get('/projects/:id', (req, res) => {
  res.render('project-detail', {
    title: 'Detalhes do Projeto - IncubePro',
    projectId: req.params.id
  });
});

// Rota para perfil do usuário (protegida)
router.get('/profile', authPage, (req, res) => {
  res.render('profile', {
    title: 'Meu Perfil - IncubePro'
  });
});

module.exports = router;