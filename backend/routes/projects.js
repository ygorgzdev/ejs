// routes/projects.js
const express = require('express');
const router = express.Router();
const {
    createProject,
    getAllProjects,
    getProjectById,
    updateProject,
    patchProject,
    deleteProject,
    getMyProjects,
    getProjectStats
} = require('../controllers/projectController');
const { auth } = require('../middleware/auth');
const {
    validateProjectCreation,
    validateProjectUpdate,
    validateObjectId,
    validatePagination
} = require('../middleware/validation');

// GET /api/v1/projects/stats - Estatísticas de projetos (rota específica antes das genéricas)
router.get('/stats', getProjectStats);

// GET /api/v1/projects/my - Projetos do usuário logado (rota específica)
router.get('/my', auth, validatePagination, getMyProjects);

// GET /api/v1/projects - Listar todos os projetos (com paginação e filtros)
router.get('/', validatePagination, getAllProjects);

// POST /api/v1/projects - Criar novo projeto (apenas para developers autenticados)
router.post('/', auth, validateProjectCreation, createProject);

// GET /api/v1/projects/:id - Buscar projeto específico por ID
router.get('/:id', validateObjectId('id'), getProjectById);

// PUT /api/v1/projects/:id - Atualizar projeto completo (apenas criador ou admin)
router.put('/:id', auth, validateObjectId('id'), validateProjectUpdate, updateProject);

// PATCH /api/v1/projects/:id - Atualizar projeto parcialmente (apenas criador ou admin)
router.patch('/:id', auth, validateObjectId('id'), patchProject);

// DELETE /api/v1/projects/:id - Deletar projeto (apenas criador ou admin)
router.delete('/:id', auth, validateObjectId('id'), deleteProject);

module.exports = router;