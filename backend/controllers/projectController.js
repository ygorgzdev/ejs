// controllers/projectController.js
const Project = require('../models/Project');
const User = require('../models/User');
const {
  sendSuccess,
  sendError,
  sendCreated,
  sendNotFound,
  sendServerError
} = require('../utils/responseHelper');

// Criar projeto
exports.createProject = async (req, res) => {
  const { title, description, category, status, fundingGoal, rewards } = req.body;

  try {
    if (req.user.role !== 'developer') {
      return sendError(res, 'Apenas desenvolvedores podem criar projetos', null, 403);
    }

    const newProject = new Project({
      title,
      description,
      category,
      status: status || 'Conceito',
      fundingGoal,
      rewards: rewards || [],
      creator: req.user.id,
    });

    await newProject.save();

    // Populate para retornar dados do criador
    await newProject.populate('creator', 'name email role');

    sendCreated(res, newProject, 'Projeto criado com sucesso');
  } catch (err) {
    console.error('Erro ao criar projeto:', err);

    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message
      }));
      return sendError(res, 'Erro de validação', errors, 422);
    }

    sendServerError(res, 'Erro interno do servidor');
  }
};

// Listar todos os projetos (com paginação e filtros)
exports.getAllProjects = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Construir filtros
    const filters = {};

    if (req.query.category) {
      filters.category = req.query.category;
    }

    if (req.query.status) {
      filters.status = req.query.status;
    }

    if (req.query.search) {
      filters.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    if (req.query.creator) {
      filters.creator = req.query.creator;
    }

    // Filtro por meta de financiamento
    if (req.query.minFunding) {
      filters.fundingGoal = { ...filters.fundingGoal, $gte: parseInt(req.query.minFunding) };
    }

    if (req.query.maxFunding) {
      filters.fundingGoal = { ...filters.fundingGoal, $lte: parseInt(req.query.maxFunding) };
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

    // Buscar projetos
    const projects = await Project.find(filters)
      .populate('creator', 'name email role avatar')
      .skip(skip)
      .limit(limit)
      .sort(sortBy);

    // Contar total de projetos
    const total = await Project.countDocuments(filters);

    const meta = {
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      filters: {
        category: req.query.category || null,
        status: req.query.status || null,
        search: req.query.search || null
      }
    };

    sendSuccess(res, projects, 'Projetos recuperados com sucesso', 200, meta);
  } catch (err) {
    console.error('Erro ao buscar projetos:', err);
    sendServerError(res, 'Erro interno do servidor');
  }
};

// Buscar projeto por ID
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('creator', 'name email role bio skills avatar createdAt');

    if (!project) {
      return sendNotFound(res, 'Projeto não encontrado');
    }

    sendSuccess(res, project, 'Projeto recuperado com sucesso');
  } catch (err) {
    console.error('Erro ao buscar projeto:', err);

    if (err.name === 'CastError') {
      return sendError(res, 'ID do projeto inválido', null, 400);
    }

    sendServerError(res, 'Erro interno do servidor');
  }
};

// Atualizar projeto completo (PUT)
exports.updateProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const { title, description, category, status, fundingGoal, rewards } = req.body;

    // Buscar projeto
    const project = await Project.findById(projectId);

    if (!project) {
      return sendNotFound(res, 'Projeto não encontrado');
    }

    // Verificar se o usuário é o criador do projeto ou admin
    if (project.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return sendError(res, 'Acesso negado. Você só pode atualizar seus próprios projetos', null, 403);
    }

    // Atualizar projeto
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      {
        title,
        description,
        category,
        status,
        fundingGoal,
        rewards: rewards || []
      },
      { new: true, runValidators: true }
    ).populate('creator', 'name email role');

    sendSuccess(res, updatedProject, 'Projeto atualizado com sucesso');
  } catch (err) {
    console.error('Erro ao atualizar projeto:', err);

    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message
      }));
      return sendError(res, 'Erro de validação', errors, 422);
    }

    if (err.name === 'CastError') {
      return sendError(res, 'ID do projeto inválido', null, 400);
    }

    sendServerError(res, 'Erro interno do servidor');
  }
};

// Atualizar projeto parcialmente (PATCH)
exports.patchProject = async (req, res) => {
  try {
    const projectId = req.params.id;
    const updates = req.body;

    // Buscar projeto
    const project = await Project.findById(projectId);

    if (!project) {
      return sendNotFound(res, 'Projeto não encontrado');
    }

    // Verificar se o usuário é o criador do projeto ou admin
    if (project.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return sendError(res, 'Acesso negado. Você só pode atualizar seus próprios projetos', null, 403);
    }

    // Campos permitidos para atualização
    const allowedFields = ['title', 'description', 'category', 'status', 'fundingGoal', 'rewards'];
    const updateFields = {};

    // Filtrar apenas campos permitidos
    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        updateFields[key] = updates[key];
      }
    });

    // Verificar se há campos para atualizar
    if (Object.keys(updateFields).length === 0) {
      return sendError(res, 'Nenhum campo válido fornecido para atualização', null, 400);
    }

    // Atualizar projeto
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).populate('creator', 'name email role');

    sendSuccess(res, updatedProject, 'Projeto atualizado com sucesso');
  } catch (err) {
    console.error('Erro ao atualizar projeto:', err);

    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message
      }));
      return sendError(res, 'Erro de validação', errors, 422);
    }

    if (err.name === 'CastError') {
      return sendError(res, 'ID do projeto inválido', null, 400);
    }

    sendServerError(res, 'Erro interno do servidor');
  }
};

// Deletar projeto
exports.deleteProject = async (req, res) => {
  try {
    const projectId = req.params.id;

    // Buscar projeto
    const project = await Project.findById(projectId);

    if (!project) {
      return sendNotFound(res, 'Projeto não encontrado');
    }

    // Verificar se o usuário é o criador do projeto ou admin
    if (project.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return sendError(res, 'Acesso negado. Você só pode deletar seus próprios projetos', null, 403);
    }

    // Deletar projeto
    await Project.findByIdAndDelete(projectId);

    sendSuccess(res, null, 'Projeto deletado com sucesso');
  } catch (err) {
    console.error('Erro ao deletar projeto:', err);

    if (err.name === 'CastError') {
      return sendError(res, 'ID do projeto inválido', null, 400);
    }

    sendServerError(res, 'Erro interno do servidor');
  }
};

// Obter projetos do usuário logado
exports.getMyProjects = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filtros adicionais
    const filters = { creator: req.user.id };

    if (req.query.status) {
      filters.status = req.query.status;
    }

    if (req.query.category) {
      filters.category = req.query.category;
    }

    // Buscar projetos do usuário
    const projects = await Project.find(filters)
      .populate('creator', 'name email role')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Contar total
    const total = await Project.countDocuments(filters);

    const meta = {
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };

    sendSuccess(res, projects, 'Seus projetos recuperados com sucesso', 200, meta);
  } catch (err) {
    console.error('Erro ao buscar projetos do usuário:', err);
    sendServerError(res, 'Erro interno do servidor');
  }
};

// Obter estatísticas de projetos
exports.getProjectStats = async (req, res) => {
  try {
    // Estatísticas gerais
    const totalProjects = await Project.countDocuments();

    const statusStats = await Project.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalFunding: { $sum: '$fundingGoal' },
          avgFunding: { $avg: '$fundingGoal' }
        }
      }
    ]);

    const categoryStats = await Project.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalFunding: { $sum: '$fundingGoal' }
        }
      }
    ]);

    // Projeto com maior meta de financiamento
    const highestFunding = await Project.findOne()
      .sort({ fundingGoal: -1 })
      .populate('creator', 'name role');

    const stats = {
      total: totalProjects,
      byStatus: statusStats,
      byCategory: categoryStats,
      highestFundingProject: highestFunding
    };

    sendSuccess(res, stats, 'Estatísticas recuperadas com sucesso');
  } catch (err) {
    console.error('Erro ao buscar estatísticas:', err);
    sendServerError(res, 'Erro interno do servidor');
  }
};