// routes/users.js
const express = require('express');
const router = express.Router();
const {
    createUser,
    getAllUsers,
    getUserById,
    getProfile,
    updateProfile,
    updateUser,
    deleteUser,
    getUserStats
} = require('../controllers/userController');
const { auth } = require('../middleware/auth');
const {
    validateUserRegistration,
    validateUserUpdate,
    validateObjectId,
    validatePagination
} = require('../middleware/validation');

// GET /api/v1/users/profile - Obter perfil do usuário logado (rota específica)
router.get('/profile', auth, getProfile);

// PUT /api/v1/users/profile - Atualizar perfil do usuário logado (rota específica)
router.put('/profile', auth, validateUserUpdate, updateProfile);

// GET /api/v1/users - Listar todos os usuários (com paginação e filtros)
router.get('/', validatePagination, getAllUsers);

// POST /api/v1/users - Criar novo usuário (register)
router.post('/', validateUserRegistration, createUser);

// GET /api/v1/users/:id/stats - Estatísticas do usuário (rota específica antes da genérica)
router.get('/:id/stats', validateObjectId('id'), getUserStats);

// GET /api/v1/users/:id - Buscar usuário específico por ID
router.get('/:id', validateObjectId('id'), getUserById);

// PUT /api/v1/users/:id - Atualizar usuário por ID (apenas o próprio usuário ou admin)
router.put('/:id', auth, validateObjectId('id'), validateUserUpdate, updateUser);

// DELETE /api/v1/users/:id - Deletar usuário por ID (apenas o próprio usuário ou admin)
router.delete('/:id', auth, validateObjectId('id'), deleteUser);

module.exports = router;