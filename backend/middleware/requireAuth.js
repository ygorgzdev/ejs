// middleware/requireAuth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Project = require('../models/Project');
const mongoose = require('mongoose');

const requireAuth = async (req, res, next) => {
    try {
        // Verificar se o token existe nos cookies
        const token = req.cookies.token;

        if (!token) {
            // Se for uma requisição AJAX/API
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(401).json({
                    success: false,
                    message: 'Acesso negado. Token de autenticação necessário.'
                });
            }

            // Para requisições de página, redirecionar para login
            return res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
        }

        // Verificar e decodificar o token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Buscar usuário no banco de dados
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            // Usuário não existe mais no banco
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/'
            });

            // Se for uma requisição AJAX/API
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Usuário não encontrado.'
                });
            }

            // Para requisições de página, redirecionar para login
            return res.redirect('/login?error=user_not_found');
        }

        // Adicionar usuário à requisição e às variáveis locais
        req.user = user;
        res.locals.user = user;

        next();
    } catch (err) {
        console.error('Erro no middleware requireAuth:', err.message);

        // Limpar cookie inválido
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });

        // Tratamento de erros específicos do JWT
        if (err.name === 'JsonWebTokenError') {
            // Se for uma requisição AJAX/API
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(401).json({
                    success: false,
                    message: 'Token inválido.'
                });
            }

            return res.redirect('/login?error=invalid_token');
        }

        if (err.name === 'TokenExpiredError') {
            // Se for uma requisição AJAX/API
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(401).json({
                    success: false,
                    message: 'Token expirado. Faça login novamente.'
                });
            }

            return res.redirect('/login?error=expired');
        }

        // Erro genérico do servidor
        if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
            return res.status(500).json({
                success: false,
                message: 'Erro interno do servidor.'
            });
        }

        // Para requisições de página, redirecionar para login
        res.redirect('/login?error=server_error');
    }
};

// Middleware para verificar se o usuário tem uma role específica
const requireRole = (roles) => {
    return (req, res, next) => {
        // Verificar se req.user existe (usuário autenticado)
        if (!req.user) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(401).json({
                    success: false,
                    message: 'Acesso negado. Usuário não autenticado.'
                });
            }
            return res.redirect('/login');
        }

        // Normalizar roles para array
        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        // Verificar se o usuário tem a role necessária
        if (!allowedRoles.includes(req.user.role)) {
            if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
                return res.status(403).json({
                    success: false,
                    message: `Acesso negado. Requer uma das seguintes roles: ${allowedRoles.join(', ')}`
                });
            }

            // Para páginas, redirecionar para uma página de erro ou página inicial
            return res.status(403).render('error', {
                title: 'Acesso Negado - IncubePro',
                message: 'Você não tem permissão para acessar esta página.',
                error: process.env.NODE_ENV === 'development' ?
                    { stack: `Requer role: ${allowedRoles.join(' ou ')}. Usuário atual: ${req.user.role}` } :
                    null
            });
        }

        next();
    };
};

// Middleware para verificar se é desenvolvedor
const requireDeveloper = requireRole('developer');

// Middleware para verificar se é investidor
const requireInvestor = requireRole('investor');

// Middleware para verificar se é desenvolvedor OU investidor (qualquer usuário logado)
const requireAnyRole = requireRole(['developer', 'investor']);

module.exports = {
    requireAuth,
    requireRole,
    requireDeveloper,
    requireInvestor,
    requireAnyRole
};