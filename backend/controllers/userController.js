// controllers/userController.js
const User = require('../models/User');
const Project = require('../models/Project');
const {
  sendSuccess,
  sendError,
  sendCreated,
  sendNotFound,
  sendServerError
} = require('../utils/responseHelper');

// Criar usuário (register)
exports.createUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    // Verificar se o usuário já existe
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendError(res, 'E-mail já está em uso', null, 409);
    }

    // Criar novo usuário
    const user = new User({ name, email, password, role });
    await user.save();

    // Remover senha do objeto de resposta
    const userResponse = user.toObject();
    delete userResponse.password;

    sendCreated(res, userResponse, 'Usuário criado com sucesso');
  } catch (err) {
    console.error('Erro ao criar usuário:', err);
    sendServerError(res, 'Erro interno do servidor');
  }
};

// Listar todos os usuários (com paginação e filtros)
exports.getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Construir filtros
    const filters = {};
    if (req.query.role) {
      filters.role = req.query.role;
    }

    if (req.query.search) {
      filters.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } }
      ];
    }

    // Buscar usuários
    const users = await User.find(filters)
      .select('-password')
      .populate('projects', 'title status category')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Contar total de usuários
    const total = await User.countDocuments(filters);

    const meta = {
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };

    sendSuccess(res, users, 'Usuários recuperados com sucesso', 200, meta);
  } catch (err) {
    console.error('Erro ao buscar usuários:', err);
    sendServerError(res, 'Erro interno do servidor');
  }
};

// Buscar usuário por ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('projects', 'title status category fundingGoal currentFunding createdAt');

    if (!user) {
      return sendNotFound(res, 'Usuário não encontrado');
    }

    sendSuccess(res, user, 'Usuário recuperado com sucesso');
  } catch (err) {
    console.error('Erro ao buscar usuário:', err);
    sendServerError(res, 'Erro interno do servidor');
  }
};

// Obter perfil do usuário logado
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('projects', 'title status category fundingGoal currentFunding createdAt');

    sendSuccess(res, user, 'Perfil recuperado com sucesso');
  } catch (err) {
    console.error('Erro ao carregar perfil:', err);
    sendServerError(res, 'Erro interno do servidor');
  }
};

// Atualizar perfil do usuário logado
exports.updateProfile = async (req, res) => {
  try {
    const { name, bio, skills, avatar } = req.body;

    // Campos atualizáveis
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (bio !== undefined) updateFields.bio = bio;
    if (skills !== undefined) updateFields.skills = skills;
    if (avatar !== undefined) updateFields.avatar = avatar;

    // Atualizar o perfil do usuário
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    sendSuccess(res, updatedUser, 'Perfil atualizado com sucesso');
  } catch (err) {
    console.error('Erro ao atualizar perfil:', err);
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

// Atualizar usuário por ID (apenas admin ou o próprio usuário)
exports.updateUser = async (req, res) => {
  try {
    const { name, bio, skills, avatar, role } = req.body;
    const userId = req.params.id;

    // Verificar se o usuário pode atualizar este perfil
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return sendError(res, 'Acesso negado', null, 403);
    }

    // Campos atualizáveis
    const updateFields = {};
    if (name !== undefined) updateFields.name = name;
    if (bio !== undefined) updateFields.bio = bio;
    if (skills !== undefined) updateFields.skills = skills;
    if (avatar !== undefined) updateFields.avatar = avatar;

    // Apenas admin pode alterar role
    if (role !== undefined && req.user.role === 'admin') {
      updateFields.role = role;
    }

    // Atualizar usuário
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return sendNotFound(res, 'Usuário não encontrado');
    }

    sendSuccess(res, updatedUser, 'Usuário atualizado com sucesso');
  } catch (err) {
    console.error('Erro ao atualizar usuário:', err);
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

// Deletar usuário (apenas o próprio usuário ou admin)
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Verificar se o usuário pode deletar este perfil
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return sendError(res, 'Acesso negado', null, 403);
    }

    // Buscar usuário
    const user = await User.findById(userId);
    if (!user) {
      return sendNotFound(res, 'Usuário não encontrado');
    }

    // Deletar projetos associados se for um developer
    if (user.role === 'developer') {
      await Project.deleteMany({ creator: userId });
    }

    // Deletar usuário
    await User.findByIdAndDelete(userId);

    sendSuccess(res, null, 'Usuário deletado com sucesso');
  } catch (err) {
    console.error('Erro ao deletar usuário:', err);
    sendServerError(res, 'Erro interno do servidor');
  }
};

// Obter estatísticas do usuário
exports.getUserStats = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return sendNotFound(res, 'Usuário não encontrado');
    }

    let stats = {
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt
      }
    };

    if (user.role === 'developer') {
      // Estatísticas para desenvolvedores
      const projects = await Project.find({ creator: userId });

      stats.developer = {
        totalProjects: projects.length,
        projectsByStatus: {
          conceito: projects.filter(p => p.status === 'Conceito').length,
          emAndamento: projects.filter(p => p.status === 'Em andamento').length,
          beta: projects.filter(p => p.status === 'Versão beta').length,
          lancado: projects.filter(p => p.status === 'No ar (lançado)').length
        },
        totalFundingGoal: projects.reduce((sum, p) => sum + p.fundingGoal, 0),
        totalCurrentFunding: projects.reduce((sum, p) => sum + p.currentFunding, 0)
      };
    }

    sendSuccess(res, stats, 'Estatísticas recuperadas com sucesso');
  } catch (err) {
    console.error('Erro ao buscar estatísticas:', err);
    sendServerError(res, 'Erro interno do servidor');
  }
};