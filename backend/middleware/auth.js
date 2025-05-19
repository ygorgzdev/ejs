// Arquivo atualizado para backend/middleware/auth.js
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