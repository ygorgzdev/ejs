// backend/middleware/security.js

const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const helmet = require('helmet');

// Configuração básica do Helmet (segurança de cabeçalhos HTTP)
exports.configureHelmet = (app) => {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com'],
                styleSrc: ["'self'", 'cdn.jsdelivr.net', 'cdnjs.cloudflare.com', "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:'],
                fontSrc: ["'self'", 'cdnjs.cloudflare.com'],
            },
        },
        xssFilter: true,
        noSniff: true,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    }));
};

// Rate limiting para rotas sensíveis
exports.apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // limite por IP
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Muitas requisições desta origem, tente novamente em 15 minutos'
});

// Rate limiter específico para autenticação (mais restritivo)
exports.authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // Apenas 10 tentativas por 15 minutos
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Muitas tentativas de login, tente novamente em 15 minutos'
});

// Middleware de validação para registro
exports.validateRegistration = [
    body('name').trim().isLength({ min: 3 }).withMessage('Nome deve ter pelo menos 3 caracteres'),
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password')
        .isLength({ min: 8 }).withMessage('Senha deve ter pelo menos 8 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
        .withMessage('Senha deve conter letra maiúscula, minúscula, número e caractere especial'),
    body('confirmPassword').custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Senhas não coincidem');
        }
        return true;
    }),
    body('role').isIn(['developer', 'investor']).withMessage('Perfil inválido')
];

// Middleware de validação para login
exports.validateLogin = [
    body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Senha é obrigatória')
];

// Middleware de validação para criação de projeto
exports.validateProject = [
    body('title').trim().isLength({ min: 5 }).withMessage('Título deve ter pelo menos 5 caracteres'),
    body('description').trim().isLength({ min: 20 }).withMessage('Descrição deve ter pelo menos 20 caracteres'),
    body('category').isIn(['Web Development', 'Mobile App', 'AI/Machine Learning', 'Blockchain', 'IoT', 'Games', 'Others'])
        .withMessage('Categoria inválida'),
    body('fundingGoal').isNumeric().withMessage('Meta de financiamento deve ser um número').toFloat()
        .custom(value => value >= 1000).withMessage('Meta de financiamento deve ser de pelo menos R$ 1.000')
];

// Middleware para verificar e processar erros de validação
exports.handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Para requisições API JSON
        if (req.headers['content-type'] === 'application/json') {
            return res.status(400).json({
                errors: errors.array().map(err => ({ field: err.param, message: err.msg }))
            });
        }
        // Para requisições de formulário
        else {
            // Extrair os erros como objeto para exibir no formulário
            const errorMessages = {};
            errors.array().forEach(err => {
                errorMessages[err.param] = err.msg;
            });

            // Redirecionar de volta com os erros e os dados para repopular o formulário
            req.session.formErrors = errorMessages;
            req.session.formData = req.body;

            // Determinar para qual rota redirecionar com base na URL atual
            const route = req.path.includes('login') ? '/login' : '/register';
            return res.redirect(route);
        }
    }
    next();
};

// Configuração reforçada de cookies para produção
exports.configureCookieOptions = (isProduction) => {
    return {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
        maxAge: 2 * 24 * 60 * 60 * 1000, // 2 dias
        path: '/'
    };
};

// Middleware para configurar proteções contra XSS
exports.xssProtection = (req, res, next) => {
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
};