const express = require('express');
const router = express.Router();
const { getProfile, updateProfile } = require('../controllers/userController');
const { auth } = require('../middleware/auth');

// Rota para obter os dados do perfil do usuário autenticado
router.get('/profile', auth, getProfile);

// Adicionando uma rota para atualizar perfil (será útil para implementação futura)
router.put('/profile', auth, updateProfile);

module.exports = router;