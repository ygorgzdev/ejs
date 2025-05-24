// server.js - Servidor atualizado com padrões RESTful
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const connectDB = require('./config/db');

// Rotas da API v1
const userRoutes = require('./routes/users');
const projectRoutes = require('./routes/projects');
const sessionRoutes = require('./routes/sessions');

// Rotas de páginas (EJS) e rotas de auth legacy
const authRoutes = require('./routes/auth'); // Manter para compatibilidade
const pageRoutes = require('./routes/pages');

// Carrega variáveis de ambiente
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares de segurança
app.use(helmet({
  contentSecurityPolicy: false, // Desabilitar CSP para EJS funcionar
}));

// Configuração de CORS
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8080',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middlewares de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));

// Configurando a view engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Servindo arquivos estáticos
app.use(express.static(path.join(__dirname, '/public')));

// Middleware para logging em desenvolvimento
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
    next();
  });
}

// Middleware para disponibilizar a variável user para todas as views
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// ===========================================
// ROTAS DE PÁGINAS (EJS) - SEM VERSIONAMENTO
// ===========================================
app.use('/', pageRoutes);

// ===========================================
// ROTAS DA API v1 - COM VERSIONAMENTO
// ===========================================

// Rota de health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'IncubePro API está funcionando!',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API v1 Routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1/sessions', sessionRoutes);

// ===========================================
// ROTAS LEGACY (PARA COMPATIBILIDADE)
// ===========================================
app.use('/api/auth', authRoutes); // Manter rotas antigas para compatibilidade

// Alias da API v1 como padrão (sem versionamento)
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/sessions', sessionRoutes);

// ===========================================
// MIDDLEWARE DE TRATAMENTO DE ERROS
// ===========================================

// Middleware para rotas não encontradas da API
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint da API não encontrado',
    availableVersions: ['v1'],
    availableEndpoints: {
      v1: [
        'GET /api/v1/users',
        'POST /api/v1/users',
        'GET /api/v1/users/:id',
        'PUT /api/v1/users/:id',
        'DELETE /api/v1/users/:id',
        'GET /api/v1/users/profile',
        'PUT /api/v1/users/profile',
        'GET /api/v1/projects',
        'POST /api/v1/projects',
        'GET /api/v1/projects/:id',
        'PUT /api/v1/projects/:id',
        'PATCH /api/v1/projects/:id',
        'DELETE /api/v1/projects/:id',
        'GET /api/v1/projects/my',
        'POST /api/v1/sessions',
        'GET /api/v1/sessions/current',
        'PUT /api/v1/sessions/refresh',
        'DELETE /api/v1/sessions'
      ]
    }
  });
});

// Rota 404 para páginas - precisa estar no final de todas as rotas
app.use((req, res) => {
  res.status(404).render('404', { title: 'Página não encontrada' });
});

// Middleware de tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);

  // Se for uma requisição da API
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      ...(process.env.NODE_ENV === 'development' && { error: err.message })
    });
  }

  // Se for uma página
  res.status(500).render('error', {
    title: 'Erro interno',
    error: process.env.NODE_ENV === 'development' ? err : null
  });
});

// ===========================================
// INICIALIZAÇÃO DO SERVIDOR
// ===========================================
const startServer = async () => {
  try {
    // Conectar ao banco de dados
    await connectDB();

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log('🚀 IncubePro API iniciada com sucesso!');
      console.log(`📡 Servidor rodando em: http://localhost:${PORT}`);
      console.log(`🔗 API v1: http://localhost:${PORT}/api/v1/`);
      console.log(`🌐 Páginas: http://localhost:${PORT}/`);
      console.log(`💻 Ambiente: ${process.env.NODE_ENV || 'development'}`);
      console.log('=====================================');

      // Mostrar endpoints disponíveis em desenvolvimento
      if (process.env.NODE_ENV === 'development') {
        console.log('📋 Endpoints principais:');
        console.log('   GET  /api/v1/users          - Listar usuários');
        console.log('   POST /api/v1/users          - Criar usuário');
        console.log('   GET  /api/v1/projects       - Listar projetos');
        console.log('   POST /api/v1/projects       - Criar projeto');
        console.log('   POST /api/v1/sessions       - Login');
        console.log('   GET  /api/v1/sessions/current - Verificar sessão');
        console.log('   GET  /api/health            - Health check');
        console.log('=====================================');
      }
    });
  } catch (err) {
    console.error('❌ Erro ao iniciar o servidor:', err.message);
    process.exit(1);
  }
};

// Tratamento de sinais para encerramento limpo
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recebido, encerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recebido, encerrando servidor...');
  process.exit(0);
});

// Iniciar servidor
startServer();