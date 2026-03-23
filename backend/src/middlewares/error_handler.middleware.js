const { logger } = require('./logger.middleware');
const { AppError } = require('../utils/errors');

function errorHandler(err, req, res, _next) {
  const status_code = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof AppError ? err.message : 'Internal Server Error';

  logger.error({
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    statusCode: status_code,
  });

  res.status(status_code).json({
    success: false,
    data: null,
    error: message,
  });
}

module.exports = { errorHandler };
