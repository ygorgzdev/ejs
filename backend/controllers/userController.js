const User = require('../models/User');

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: 'Erro ao carregar perfil' });
  }
};

// Adicionando a função updateProfile que estava faltando
exports.updateProfile = async (req, res) => {
  try {
    const { name, bio, skills } = req.body;
    
    // Campos atualizáveis
    const updateFields = {};
    if (name) updateFields.name = name;
    if (bio) updateFields.bio = bio;
    if (skills) updateFields.skills = skills;
    
    // Atualizar o perfil do usuário
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true }
    ).select('-password');
    
    res.json(updatedUser);
  } catch (err) {
    console.error('Erro ao atualizar perfil:', err);
    res.status(500).json({ msg: 'Erro ao atualizar perfil', error: err.message });
  }
};