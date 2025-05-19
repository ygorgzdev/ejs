// backend/utils/pagination.js

/**
 * Utilitário para facilitar a implementação de paginação nas consultas
 * @param {Object} req - O objeto de requisição Express
 * @param {Object} defaultOptions - Opções padrão (page, limit, sort)
 * @returns {Object} Opções de paginação processadas
 */
exports.getPaginationOptions = (req, defaultOptions = {}) => {
    const page = parseInt(req.query.page) || defaultOptions.page || 1;
    const limit = parseInt(req.query.limit) || defaultOptions.limit || 10;
    const skip = (page - 1) * limit;

    // Opções de ordenação
    let sort = {};
    if (req.query.sortBy) {
        const sortField = req.query.sortBy;
        const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;
        sort[sortField] = sortOrder;
    } else if (defaultOptions.sortBy) {
        sort[defaultOptions.sortBy] = defaultOptions.sortOrder === 'desc' ? -1 : 1;
    } else {
        // Ordenação padrão por data de criação, mais recentes primeiro
        sort = { createdAt: -1 };
    }

    return {
        page,
        limit,
        skip,
        sort
    };
};

/**
 * Formata a resposta incluindo metadados de paginação
 * @param {Array} data - Os dados a serem retornados
 * @param {number} total - Total de registros encontrados
 * @param {Object} options - Opções de paginação usadas
 * @returns {Object} Resposta formatada com metadados
 */
exports.paginatedResponse = (data, total, options) => {
    const { page, limit } = options;
    const totalPages = Math.ceil(total / limit);

    return {
        data,
        pagination: {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1
        }
    };
};