// middleware/validation.js
const { body, param, query, validationResult } = require('express-validator');
const { sendValidationError } = require('../utils/responseHelper');

// Middleware para verificar resultados da validação
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(error => ({
            field: error.path,
            message: error.msg,
            value: error.value
        }));
        return sendValidationError(res, formattedErrors);
    }
    next();
};

// Validações para Usuário
const validateUserRegistration = [
    body('name')
        .trim()
        .notEmpty()
        .withMessage('Nome é obrigatório')
        .isLength({ min: 2, max: 50 })
        .withMessage('Nome deve ter entre 2 e 50 caracteres'),

    body('email')
        .trim()
        .isEmail()
        .withMessage('Email deve ser válido')
        .normalizeEmail(),

    body('password')
        .isLength({ min: 6 })
        .withMessage('Senha deve ter pelo menos 6 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Senha deve conter pelo menos uma letra minúscula, uma maiúscula e um número'),

    body('role')
        .isIn(['developer', 'investor'])
        .withMessage('Role deve ser developer ou investor'),

    handleValidationErrors
];

const validateUserLogin = [
    body('email')
        .trim()
        .isEmail()
        .withMessage('Email deve ser válido')
        .normalizeEmail(),

    body('password')
        .notEmpty()
        .withMessage('Senha é obrigatória'),

    handleValidationErrors
];

const validateUserUpdate = [
    body('name')
        .optional()
        .trim()
        .isLength({ min: 2, max: 50 })
        .withMessage('Nome deve ter entre 2 e 50 caracteres'),

    body('bio')
        .optional()
        .trim()
        .isLength({ max: 500 })
        .withMessage('Bio não pode ter mais de 500 caracteres'),

    body('skills')
        .optional()
        .isArray()
        .withMessage('Skills deve ser um array'),

    body('skills.*')
        .optional()
        .trim()
        .isLength({ min: 1, max: 30 })
        .withMessage('Cada skill deve ter entre 1 e 30 caracteres'),

    handleValidationErrors
];

// Validações para Projeto
const validateProjectCreation = [
    body('title')
        .trim()
        .notEmpty()
        .withMessage('Título é obrigatório')
        .isLength({ min: 3, max: 100 })
        .withMessage('Título deve ter entre 3 e 100 caracteres'),

    body('description')
        .trim()
        .notEmpty()
        .withMessage('Descrição é obrigatória')
        .isLength({ min: 10, max: 2000 })
        .withMessage('Descrição deve ter entre 10 e 2000 caracteres'),

    body('category')
        .isIn(['Desenvolvimento Web', 'Aplicativo Mobile', 'IA/Machine Learning', 'Blockchain', 'IoT', 'Jogos', 'Outros'])
        .withMessage('Categoria inválida'),

    body('status')
        .optional()
        .isIn(['Conceito', 'Em andamento', 'Versão beta', 'No ar (lançado)'])
        .withMessage('Status inválido'),

    body('fundingGoal')
        .isNumeric()
        .withMessage('Meta de financiamento deve ser um número')
        .custom((value) => {
            if (value <= 0) {
                throw new Error('Meta de financiamento deve ser maior que zero');
            }
            return true;
        }),

    body('rewards')
        .optional()
        .isArray()
        .withMessage('Recompensas deve ser um array'),

    body('rewards.*')
        .optional()
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Cada recompensa deve ter entre 1 e 200 caracteres'),

    handleValidationErrors
];

const validateProjectUpdate = [
    body('title')
        .optional()
        .trim()
        .isLength({ min: 3, max: 100 })
        .withMessage('Título deve ter entre 3 e 100 caracteres'),

    body('description')
        .optional()
        .trim()
        .isLength({ min: 10, max: 2000 })
        .withMessage('Descrição deve ter entre 10 e 2000 caracteres'),

    body('category')
        .optional()
        .isIn(['Desenvolvimento Web', 'Aplicativo Mobile', 'IA/Machine Learning', 'Blockchain', 'IoT', 'Jogos', 'Outros'])
        .withMessage('Categoria inválida'),

    body('status')
        .optional()
        .isIn(['Conceito', 'Em andamento', 'Versão beta', 'No ar (lançado)'])
        .withMessage('Status inválido'),

    body('fundingGoal')
        .optional()
        .isNumeric()
        .withMessage('Meta de financiamento deve ser um número')
        .custom((value) => {
            if (value <= 0) {
                throw new Error('Meta de financiamento deve ser maior que zero');
            }
            return true;
        }),

    body('rewards')
        .optional()
        .isArray()
        .withMessage('Recompensas deve ser um array'),

    body('rewards.*')
        .optional()
        .trim()
        .isLength({ min: 1, max: 200 })
        .withMessage('Cada recompensa deve ter entre 1 e 200 caracteres'),

    handleValidationErrors
];

// Validações para parâmetros
const validateObjectId = (paramName = 'id') => [
    param(paramName)
        .isMongoId()
        .withMessage(`${paramName} deve ser um ID válido`),

    handleValidationErrors
];

// Validações para query parameters
const validatePagination = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page deve ser um número inteiro maior que 0'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit deve ser um número entre 1 e 100'),

    query('category')
        .optional()
        .isIn(['Desenvolvimento Web', 'Aplicativo Mobile', 'IA/Machine Learning', 'Blockchain', 'IoT', 'Jogos', 'Outros'])
        .withMessage('Categoria inválida'),

    query('status')
        .optional()
        .isIn(['Conceito', 'Em andamento', 'Versão beta', 'No ar (lançado)'])
        .withMessage('Status inválido'),

    handleValidationErrors
];

module.exports = {
    handleValidationErrors,
    validateUserRegistration,
    validateUserLogin,
    validateUserUpdate,
    validateProjectCreation,
    validateProjectUpdate,
    validateObjectId,
    validatePagination
};