// middleware/userMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware para disponibilizar dados do usuário logado para todas as views
const populateUser = async (req, res, next) => {
    try {
        // Verificar se existe um token no cookie
        const token = req.cookies.token;

        if (token) {
            try {
                // Verificar e decodificar o token
                const decoded = jwt.verify(token, process.env.JWT_SECRET);

                // Buscar o usuário no banco de dados
                const user = await User.findById(decoded.id).select('-password');

                if (user) {
                    // Disponibilizar o usuário para o request e para as views
                    req.user = user;
                    res.locals.user = user;
                } else {
                    // Token válido mas usuário não existe mais - limpar cookie
                    res.clearCookie('token');
                    res.locals.user = null;
                }
            } catch (tokenError) {
                // Token inválido ou expirado - limpar cookie
                console.log('Token inválido:', tokenError.message);
                res.clearCookie('token');
                res.locals.user = null;
            }
        } else {
            // Não há token - usuário não logado
            res.locals.user = null;
        }
    } catch (error) {
        console.error('Erro no middleware populateUser:', error);
        res.locals.user = null;
    }

    next();
};

module.exports = { populateUser };