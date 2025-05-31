const jwt = require('jsonwebtoken');
const User = require('../models/User');

// POST /api/v1/sessions - Criar sessão (login)
exports.createSession = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password))) {
            return res.status(400).json({ msg: 'Credenciais inválidas' });
        }

        const token = jwt.sign(
            { id: user._id, name: user.name, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '2d' }
        );

        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 2 * 24 * 60 * 60 * 1000 // 2 dias
        });

        res.status(200).json({
            token,
            user: {
                id: user._id,
                name: user.name,
                role: user.role
            }
        });
    } catch (err) {
        console.error('Erro no login (createSession):', err);
        res.status(500).json({ msg: 'Erro interno no login', error: err.message });
    }
};

// GET /api/v1/sessions/current - Obter usuário atual com base no token
exports.getCurrentSession = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ msg: 'Não autenticado' });
        }

        res.json({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role
        });
    } catch (err) {
        console.error('Erro ao obter sessão atual:', err);
        res.status(500).json({ msg: 'Erro interno ao obter sessão' });
    }
};

// PUT /api/v1/sessions/refresh - Renovar token
exports.refreshSession = async (req, res) => {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ msg: 'Não autenticado' });
        }

        const newToken = jwt.sign(
            { id: user._id, name: user.name, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '2d' }
        );

        res.cookie('token', newToken, {
            httpOnly: true,
            maxAge: 2 * 24 * 60 * 60 * 1000
        });

        res.json({
            msg: 'Sessão renovada com sucesso',
            token: newToken
        });
    } catch (err) {
        console.error('Erro ao renovar sessão:', err);
        res.status(500).json({ msg: 'Erro interno ao renovar sessão' });
    }
};

// DELETE /api/v1/sessions - Logout
exports.deleteSession = (req, res) => {
    res.clearCookie('token');

    if (req.headers['content-type'] === 'application/json') {
        return res.json({ success: true, message: 'Logout realizado com sucesso' });
    } else {
        return res.redirect('/login');
    }
};
