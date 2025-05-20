const Project = require('../models/Project');

exports.createProject = async (req, res) => {
  const { title, description, category, status, fundingGoal, rewards } = req.body;

  try {
    const newProject = new Project({
      title,
      description,
      category,
      status,
      fundingGoal,
      rewards,
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

    const projects = await Project.find(query).populate('creator', 'name role');
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