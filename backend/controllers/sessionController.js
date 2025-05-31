// controllers/sessionController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const {
    sendSuccess,
    sendError,
    sendUnauthorized,
    sendServerError
} = require('../utils/responseHelper');

// Criar sessão (login)
exports.createSession = async (req, res) => {
    const { email, password } = req.body;
    const redirect = req.query.redirect || '/';

    try {
        // Buscar usuário por email
        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password))) {
            // Para requests de API
            if (req.headers['content-type'] === 'application/json' || req.headers.accept?.includes('application/json')) {
                return sendUnauthorized(res, 'Credenciais inválidas');
            } else {
                // Para requests de formulário (EJS)
                return res.render('login', { error: 'Email ou senha incorretos' });
            }
        }

        // Gerar token JWT
        const token = jwt.sign(
            { id: user._id, name: user.name, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '2d' }
        );

        // Preparar dados do usuário para resposta (sem senha)
        const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            bio: user.bio,
            skills: user.skills,
            avatar: user.avatar,
            createdAt: user.createdAt
        };

        // Para requests de API
        if (req.headers['content-type'] === 'application/json' || req.headers.accept?.includes('application/json')) {
            return sendSuccess(res, {
                token,
                user: userResponse
            }, 'Login realizado com sucesso');
        } else {
            // Para requests de formulário (EJS)
            res.cookie('token', token, {
                httpOnly: true,
                maxAge: 2 * 24 * 60 * 60 * 1000, // 2 dias em milissegundos
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict'
            });

            return res.redirect(redirect);
        }
    } catch (err) {
        console.error('Erro de login:', err);

        // Para requests de API
        if (req.headers['content-type'] === 'application/json' || req.headers.accept?.includes('application/json')) {
            return sendServerError(res, 'Erro interno do servidor');
        } else {
            // Para requests de formulário (EJS)
            return res.render('login', { error: 'Erro ao fazer login. Tente novamente.' });
        }
    }
};

// Obter sessão atual (verificar se está logado)
exports.getCurrentSession = async (req, res) => {
    try {
        // O middleware auth já validou o token e colocou o usuário em req.user
        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            return sendUnauthorized(res, 'Usuário não encontrado');
        }

        sendSuccess(res, { user }, 'Sessão válida');
    } catch (err) {
        console.error('Erro ao verificar sessão:', err);
        sendServerError(res, 'Erro interno do servidor');
    }
};

// Deletar sessão (logout)
exports.deleteSession = (req, res) => {
    try {
        // Limpar cookie com as mesmas opções da criação
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });

        // Para requests de API
        if (req.headers['content-type'] === 'application/json' || req.headers.accept?.includes('application/json')) {
            return sendSuccess(res, null, 'Logout realizado com sucesso');
        } else {
            // Para requests de formulário (EJS)
            return res.redirect('/login');
        }
    } catch (err) {
        console.error('Erro ao fazer logout:', err);
        sendServerError(res, 'Erro interno do servidor');
    }
};

// Refresh token (renovar sessão)
exports.refreshSession = async (req, res) => {
    try {
        // Buscar usuário atual
        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            return sendUnauthorized(res, 'Usuário não encontrado');
        }

        // Gerar novo token
        const newToken = jwt.sign(
            { id: user._id, name: user.name, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '2d' }
        );

        // Preparar dados do usuário para resposta
        const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            bio: user.bio,
            skills: user.skills,
            avatar: user.avatar,
            createdAt: user.createdAt
        };

        sendSuccess(res, {
            token: newToken,
            user: userResponse
        }, 'Token renovado com sucesso');
    } catch (err) {
        console.error('Erro ao renovar token:', err);
        sendServerError(res, 'Erro interno do servidor');
    }
};