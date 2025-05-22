// utils/responseHelper.js
const sendSuccess = (res, data = null, message = 'Success', statusCode = 200, meta = null) => {
    const response = {
        success: true,
        message,
        data
    };

    if (meta) {
        response.meta = meta;
    }

    res.status(statusCode).json(response);
};

const sendError = (res, message, errors = null, statusCode = 400) => {
    const response = {
        success: false,
        message
    };

    if (errors) {
        response.errors = errors;
    }

    res.status(statusCode).json(response);
};

const sendCreated = (res, data, message = 'Resource created successfully') => {
    sendSuccess(res, data, message, 201);
};

const sendNotFound = (res, message = 'Resource not found') => {
    sendError(res, message, null, 404);
};

const sendUnauthorized = (res, message = 'Unauthorized access') => {
    sendError(res, message, null, 401);
};

const sendValidationError = (res, errors, message = 'Validation failed') => {
    sendError(res, message, errors, 422);
};

const sendServerError = (res, message = 'Internal server error') => {
    sendError(res, message, null, 500);
};

module.exports = {
    sendSuccess,
    sendError,
    sendCreated,
    sendNotFound,
    sendUnauthorized,
    sendValidationError,
    sendServerError
};