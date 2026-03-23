const config = require('../config/env');
const { AuthError } = require('../utils/errors');

function authenticateApiKey(req, res, next) {
  const api_key = req.headers['x-api-key'];
  if (!api_key || api_key !== config.api_key) {
    return next(new AuthError('Invalid or missing API key'));
  }
  next();
}

function extractUserId(req, res, next) {
  const user_id = req.headers['x-user-id'];
  if (!user_id || user_id.trim() === '') {
    return next(new AuthError('Missing X-User-Id header'));
  }
  req.user_id = user_id.trim();
  next();
}

module.exports = { authenticateApiKey, extractUserId };
