// Arquivo: backend/middleware/auth.js

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware de autenticação para rotas da API
exports.auth = async (req, res, next) => {
  try {
    let token;

    // Verificar se o token está no header Authorization
    const authHeader = req.header('Authorization');

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Formato "Bearer [token]"
      token = authHeader.substring(7);
    } else if (req.cookies && req.cookies.token) {
      // Também aceitar token de cookie para compatibilidade
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ msg: 'Acesso negado. Nenhum token fornecido.' });
    }

    // Verificar e decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar usuário pelo ID
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(404).json({ msg: 'Usuário não encontrado.' });
    }

    // Adicionar usuário à requisição
    req.user = user;
    next();
  } catch (err) {
    console.error('Erro no middleware de autenticação:', err.message);

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ msg: 'Token inválido.' });
    }

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ msg: 'Token expirado.' });
    }

    res.status(500).json({ msg: 'Erro no servidor.' });
  }
};

// Middleware para páginas EJS - redireciona para login se não autenticado
exports.authPage = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      // Armazenar URL atual para redirecionamento pós-login
      req.session = req.session || {};
      req.session.returnTo = req.originalUrl;
      return res.redirect('/login');
    }

    // Verificar e decodificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar usuário pelo ID
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      res.clearCookie('token');
      return res.redirect('/login');
    }

    // Adicionar usuário à requisição e às variáveis locais para as views
    req.user = user;
    res.locals.user = user;
    next();
  } catch (err) {
    console.error('Erro no middleware de autenticação EJS:', err.message);

    // Limpar cookie e redirecionar para login com mensagem apropriada
    res.clearCookie('token');

    if (err.name === 'TokenExpiredError') {
      return res.redirect('/login?error=expired');
    }

    return res.redirect('/login');
  }
};

// Middleware para verificar role específico
exports.checkRole = (role) => {
  return (req, res, next) => {
    if (req.user && req.user.role === role) {
      return next();
    }

    // Para rotas API
    if (req.headers['content-type'] === 'application/json') {
      return res.status(403).json({ msg: 'Acesso negado. Permissão insuficiente.' });
    }

    // Para páginas
    return res.redirect('/');
  };
};