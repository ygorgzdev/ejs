// Arquivo: backend/server.js

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const helmet = require('helmet');
const connectDB = require('./config/db');

// Rotas
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const pageRoutes = require('./routes/pages');

// Carrega variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Configurações de segurança com Helmet
if (isProduction) {
  app.use(helmet());
}

// Configuração de CORS para permitir acesso do frontend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true
}));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Configuração da sessão
app.use(session({
  secret: process.env.COOKIE_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 dia
  }
}));

// Configurando a view engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Servindo arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para disponibilizar a variável user para todas as views
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// Middleware para prevenir clickjacking
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Rotas para páginas com EJS
app.use('/', pageRoutes);

// Rotas da API
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);

// Rota para verificar se o servidor está funcionando
app.get('/api/health', (req, res) => {
  res.json({ status: 'API está funcionando!' });
});

// Rota 404 - precisa estar no final de todas as rotas
app.use((req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Endpoint não encontrado' });
  }
  res.status(404).render('404', { title: 'Página não encontrada' });
});

// Manipulador global de erros
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (req.path.startsWith('/api')) {
    return res.status(500).json({
      error: 'Erro interno do servidor',
      message: isProduction ? null : err.message
    });
  }

  res.status(500).render('error', {
    title: 'Erro',
    error: isProduction ? 'Ocorreu um erro no servidor.' : err.message
  });
});

// Inicialização do servidor
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
      console.log(`Modo: ${process.env.NODE_ENV}`);
    });
  })
  .catch((err) => {
    console.error('Erro ao iniciar o servidor:', err.message);
  });