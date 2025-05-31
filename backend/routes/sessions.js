// routes/sessions.js
const express = require('express');
const router = express.Router();
const {
    createSession,
    getCurrentSession,
    deleteSession,
    refreshSession
} = require('../controllers/sessionController');
const { auth } = require('../middleware/auth');
const { validateUserLogin } = require('../middleware/validation');

// POST /api/v1/sessions - Criar sessão (login)
router.post('/', validateUserLogin, createSession);

// GET /api/v1/sessions/current - Obter sessão atual (verificar se está logado)
router.get('/current', auth, getCurrentSession);

// PUT /api/v1/sessions/refresh - Renovar sessão (refresh token)
router.put('/refresh', auth, refreshSession);

// DELETE /api/v1/sessions - Deletar sessão (logout)
router.delete('/', deleteSession);

module.exports = router;