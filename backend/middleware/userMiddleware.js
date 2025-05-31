const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.populateUser = async (req, res, next) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            req.user = null;
            res.locals.user = null;
            return next();
        }

        // Verificar se o token é válido
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Buscar usuário atualizado no banco
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            // Se usuário não existe mais, limpar cookie
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/'
            });
            req.user = null;
            res.locals.user = null;
            return next();
        }

        req.user = user;
        res.locals.user = user;
        next();
    } catch (err) {
        // Token inválido ou expirado
        console.log('Token inválido:', err.message);

        // Limpar cookie inválido
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            path: '/'
        });

        req.user = null;
        res.locals.user = null;
        next();
    }
}