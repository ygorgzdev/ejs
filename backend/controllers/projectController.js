// backend/controllers/projectController.js - Versão com suporte à criação via formulário
const Project = require('../models/Project');
const User = require('../models/User');
const mongoose = require('mongoose');

// Criar projeto
const createProject = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      status = 'Conceito',
      fundingGoal,
      rewards = []
    } = req.body;

    // Validações básicas
    if (!title || !description || !category || !fundingGoal) {
      const errors = [];

      if (!title) errors.push({ field: 'title', message: 'Título é obrigatório' });
      if (!description) errors.push({ field: 'description', message: 'Descrição é obrigatória' });
      if (!category) errors.push({ field: 'category', message: 'Categoria é obrigatória' });
      if (!fundingGoal) errors.push({ field: 'fundingGoal', message: 'Meta de financiamento é obrigatória' });

      return res.status(400).json({
        success: false,
        message: 'Dados obrigatórios não fornecidos',
        errors
      });
    }

    // Validar meta de financiamento
    const fundingGoalNumber = parseFloat(fundingGoal);
    if (isNaN(fundingGoalNumber) || fundingGoalNumber < 100) {
      return res.status(400).json({
        success: false,
        message: 'Meta de financiamento deve ser de pelo menos R$ 100,00',
        errors: [{ field: 'fundingGoal', message: 'Meta deve ser de pelo menos R$ 100,00' }]
      });
    }

    // Validar título e descrição
    if (title.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Título deve ter pelo menos 3 caracteres',
        errors: [{ field: 'title', message: 'Título deve ter pelo menos 3 caracteres' }]
      });
    }

    if (description.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'Descrição deve ter pelo menos 10 caracteres',
        errors: [{ field: 'description', message: 'Descrição deve ter pelo menos 10 caracteres' }]
      });
    }

    // Processar recompensas (remover entradas vazias)
    let processedRewards = [];
    if (Array.isArray(rewards)) {
      processedRewards = rewards.filter(reward => reward && reward.trim());
    } else if (typeof rewards === 'object') {
      // Se rewards vem como objeto (ex: rewards[0], rewards[1])
      processedRewards = Object.values(rewards).filter(reward => reward && reward.trim());
    }

    // Verificar se o usuário é um developer
    if (req.user.role !== 'developer') {
      return res.status(403).json({
        success: false,
        message: 'Apenas desenvolvedores podem criar projetos'
      });
    }

    // Criar projeto
    const project = new Project({
      title: title.trim(),
      description: description.trim(),
      category,
      status,
      fundingGoal: fundingGoalNumber,
      currentFunding: 0,
      rewards: processedRewards,
      creator: req.user.id,
      backers: [],
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    await project.save();

    // Popular dados do criador para retorno
    await project.populate('creator', 'name email role avatar');

    // Resposta diferenciada para requisições AJAX vs formulário normal
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      // Requisição AJAX - retornar JSON
      return res.status(201).json({
        success: true,
        message: 'Projeto criado com sucesso!',
        data: {
          project: {
            _id: project._id,
            title: project.title,
            description: project.description,
            category: project.category,
            status: project.status,
            fundingGoal: project.fundingGoal,
            currentFunding: project.currentFunding,
            rewards: project.rewards,
            creator: project.creator,
            createdAt: project.createdAt
          }
        }
      });
    } else {
      // Requisição normal - redirecionar
      return res.redirect('/meus-projetos?created=true');
    }

  } catch (error) {
    console.error('Erro ao criar projeto:', error);

    // Tratar erros de validação do Mongoose
    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));

      if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
        return res.status(400).json({
          success: false,
          message: 'Erro de validação',
          errors
        });
      } else {
        return res.status(400).render('criar-projeto', {
          title: 'Criar Novo Projeto - IncubePro',
          error: 'Erro de validação nos dados fornecidos',
          formData: req.body
        });
      }
    }

    // Erro interno do servidor
    if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    } else {
      return res.status(500).render('error', {
        title: 'Erro - IncubePro',
        message: 'Erro interno do servidor ao criar projeto',
        error: process.env.NODE_ENV === 'development' ? error : null
      });
    }
  }
};

// Listar todos os projetos
const getAllProjects = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    // Construir filtros
    const filters = {};

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
    let sortBy = { createdAt: -1 };

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

    const projects = await Project.find(filters)
      .populate('creator', 'name email role avatar')
      .skip(skip)
      .limit(limit)
      .sort(sortBy);

    const total = await Project.countDocuments(filters);

    const pagination = {
      current: page,
      pages: Math.ceil(total / limit),
      total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
      limit
    };

    res.json({
      success: true,
      data: {
        projects,
        pagination,
        filters: {
          status: req.query.status || null,
          category: req.query.category || null,
          search: req.query.search || null,
          sortBy: req.query.sortBy || 'newest'
        }
      }
    });

  } catch (error) {
    console.error('Erro ao buscar projetos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Buscar projeto por ID
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('creator', 'name email role avatar')
      .populate('backers.user', 'name email role avatar');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    res.json({
      success: true,
      data: { project }
    });

  } catch (error) {
    console.error('Erro ao buscar projeto:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID do projeto inválido'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Atualizar projeto completo (PUT)
const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    // Verificar se o usuário é o criador do projeto ou admin
    if (project.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para editar este projeto'
      });
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('creator', 'name email role avatar');

    res.json({
      success: true,
      message: 'Projeto atualizado com sucesso',
      data: { project: updatedProject }
    });

  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));

      return res.status(400).json({
        success: false,
        message: 'Erro de validação',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Atualizar projeto parcialmente (PATCH)
const patchProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    // Verificar se o usuário é o criador do projeto ou admin
    if (project.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para editar este projeto'
      });
    }

    const updatedProject = await Project.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('creator', 'name email role avatar');

    res.json({
      success: true,
      message: 'Projeto atualizado com sucesso',
      data: { project: updatedProject }
    });

  } catch (error) {
    console.error('Erro ao atualizar projeto:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message
      }));

      return res.status(400).json({
        success: false,
        message: 'Erro de validação',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Deletar projeto
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Projeto não encontrado'
      });
    }

    // Verificar se o usuário é o criador do projeto ou admin
    if (project.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Você não tem permissão para deletar este projeto'
      });
    }

    await Project.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Projeto deletado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao deletar projeto:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Buscar projetos do usuário logado
const getMyProjects = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const filters = { creator: req.user.id };

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

    let sortBy = { createdAt: -1 };

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
      }
    }

    const projects = await Project.find(filters)
      .populate('creator', 'name email role avatar')
      .skip(skip)
      .limit(limit)
      .sort(sortBy);

    const total = await Project.countDocuments(filters);

    const pagination = {
      current: page,
      pages: Math.ceil(total / limit),
      total,
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1,
      limit
    };

    res.json({
      success: true,
      data: {
        projects,
        pagination,
        filters: {
          status: req.query.status || null,
          category: req.query.category || null,
          search: req.query.search || null,
          sortBy: req.query.sortBy || 'newest'
        }
      }
    });

  } catch (error) {
    console.error('Erro ao buscar meus projetos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

// Estatísticas de projetos
const getProjectStats = async (req, res) => {
  try {
    const stats = await Project.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          totalFunding: { $sum: '$currentFunding' },
          totalGoal: { $sum: '$fundingGoal' },
          avgFunding: { $avg: '$currentFunding' },
          avgGoal: { $avg: '$fundingGoal' }
        }
      }
    ]);

    const statusStats = await Project.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const categoryStats = await Project.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        general: stats[0] || {
          total: 0,
          totalFunding: 0,
          totalGoal: 0,
          avgFunding: 0,
          avgGoal: 0
        },
        byStatus: statusStats,
        byCategory: categoryStats
      }
    });

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
};

module.exports = {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  patchProject,
  deleteProject,
  getMyProjects,
  getProjectStats
};