// backend/controllers/projectController.js (atualizado)

const Project = require('../models/Project');
const mongoose = require('mongoose');
const { getPaginationOptions, paginatedResponse } = require('../utils/pagination');

exports.createProject = async (req, res) => {
  const { title, description, category, status, fundingGoal, rewards } = req.body;

  try {
    const newProject = new Project({
      title,
      description,
      category,
      status: status || 'Concept',
      fundingGoal,
      rewards: rewards || [],
      creator: req.user.id,
    });

    await newProject.save();
    res.status(201).json(newProject);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(error => ({
        field: error.path,
        message: error.message
      }));
      return res.status(400).json({
        msg: 'Erro de validação',
        errors: validationErrors
      });
    }

    console.error('Erro ao criar projeto:', err);
    res.status(500).json({ msg: 'Erro ao criar projeto' });
  }
};

exports.getAllProjects = async (req, res) => {
  try {
    let query = {};

    // Filtros avançados
    if (req.query.category) {
      query.category = req.query.category;
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    if (req.query.creator) {
      query.creator = req.query.creator;
    }

    // Busca por texto
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Filtro por meta de financiamento
    if (req.query.minFunding) {
      query.fundingGoal = { $gte: Number(req.query.minFunding) };
    }

    if (req.query.maxFunding) {
      if (query.fundingGoal) {
        query.fundingGoal.$lte = Number(req.query.maxFunding);
      } else {
        query.fundingGoal = { $lte: Number(req.query.maxFunding) };
      }
    }

    // Aplicar paginação
    const paginationOptions = getPaginationOptions(req, {
      limit: 12,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });

    // Contar total de documentos para paginação
    const total = await Project.countDocuments(query);

    // Executar a consulta com paginação
    const projects = await Project.find(query)
      .populate('creator', 'name role')
      .sort(paginationOptions.sort)
      .skip(paginationOptions.skip)
      .limit(paginationOptions.limit);

    // Retornar resposta paginada
    res.json(paginatedResponse(projects, total, paginationOptions));
  } catch (err) {
    console.error('Erro ao carregar projetos:', err);
    res.status(500).json({ msg: 'Erro ao carregar projetos' });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const projectId = req.params.id;

    // Validar o formato do ID antes de consultar
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ msg: 'ID do projeto inválido' });
    }

    const project = await Project.findById(projectId)
      .populate('creator', 'name email role');

    if (!project) {
      return res.status(404).json({ msg: 'Projeto não encontrado' });
    }

    res.json(project);
  } catch (err) {
    console.error('Erro ao carregar projeto:', err);
    res.status(500).json({ msg: 'Erro ao carregar projeto' });
  }
};

// Nova função para atualizar projeto
exports.updateProject = async (req, res) => {
  try {
    const projectId = req.params.id;

    // Validar formato do ID
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ msg: 'ID do projeto inválido' });
    }

    // Verificar se o projeto existe
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ msg: 'Projeto não encontrado' });
    }

    // Verificar se o usuário é o criador do projeto
    if (project.creator.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Você não tem permissão para atualizar este projeto' });
    }

    // Campos permitidos para atualização
    const { title, description, status, category, fundingGoal, rewards } = req.body;

    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (status) updateData.status = status;
    if (category) updateData.category = category;
    if (fundingGoal) updateData.fundingGoal = fundingGoal;
    if (rewards) updateData.rewards = rewards;

    // Atualizar projeto
    const updatedProject = await Project.findByIdAndUpdate(
      projectId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate('creator', 'name role');

    res.json(updatedProject);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const validationErrors = Object.values(err.errors).map(error => ({
        field: error.path,
        message: error.message
      }));
      return res.status(400).json({
        msg: 'Erro de validação',
        errors: validationErrors
      });
    }

    console.error('Erro ao atualizar projeto:', err);
    res.status(500).json({ msg: 'Erro ao atualizar projeto' });
  }
};

// Nova função para deletar projeto
exports.deleteProject = async (req, res) => {
  try {
    const projectId = req.params.id;

    // Validar formato do ID
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(400).json({ msg: 'ID do projeto inválido' });
    }

    // Encontrar o projeto
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ msg: 'Projeto não encontrado' });
    }

    // Verificar se o usuário é o criador do projeto
    if (project.creator.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Você não tem permissão para excluir este projeto' });
    }

    // Excluir o projeto
    await Project.findByIdAndDelete(projectId);

    res.json({ msg: 'Projeto excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir projeto:', err);
    res.status(500).json({ msg: 'Erro ao excluir projeto' });
  }
};