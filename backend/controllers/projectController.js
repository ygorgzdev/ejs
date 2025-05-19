// Arquivo: backend/controllers/projectController.js

const Project = require('../models/Project');

exports.createProject = async (req, res) => {
  const { title, description, category, status, fundingGoal, rewards } = req.body;

  // Validações básicas
  if (!title || !description || !category || !fundingGoal) {
    return res.status(400).json({ msg: 'Título, descrição, categoria e meta de financiamento são obrigatórios' });
  }

  try {
    const newProject = new Project({
      title,
      description,
      category,
      status: status || 'Concept', // Usar o padrão se não for fornecido
      fundingGoal,
      rewards: rewards || [],
      creator: req.user.id,
    });

    await newProject.save();
    res.status(201).json(newProject);
  } catch (err) {
    res.status(500).json({ msg: 'Erro ao criar projeto', error: err.message });
  }
};

exports.getAllProjects = async (req, res) => {
  try {
    let query = {};

    // Filtrar por categoria (se fornecido)
    if (req.query.category) {
      query.category = req.query.category;
    }

    // Adicionar limite se solicitado
    const limit = req.query.limit ? parseInt(req.query.limit) : 0;

    let projectQuery = Project.find(query).populate('creator', 'name role');

    // Aplicar limite se fornecido
    if (limit > 0) {
      projectQuery = projectQuery.limit(limit);
    }

    const projects = await projectQuery;
    res.json(projects);
  } catch (err) {
    res.status(500).json({ msg: 'Erro ao carregar projetos', error: err.message });
  }
};

exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('creator', 'name email role');

    if (!project) {
      return res.status(404).json({ msg: 'Projeto não encontrado' });
    }

    res.json(project);
  } catch (err) {
    res.status(500).json({ msg: 'Erro ao carregar projeto', error: err.message });
  }
};