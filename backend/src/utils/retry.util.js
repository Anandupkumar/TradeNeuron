const { logger } = require('../middlewares/logger.middleware');

async function withRetry(fn, options = {}) {
  const {
    max_retries = 3,
    backoff_base_ms = 1000,
    label = 'operation',
  } = options;

  for (let attempt = 1; attempt <= max_retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === max_retries) {
        logger.error(`${label} failed after ${max_retries} attempts: ${error.message}`);
        throw error;
      }
      const delay = backoff_base_ms * Math.pow(2, attempt - 1);
      logger.warn(`${label} attempt ${attempt} failed, retrying in ${delay}ms: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

module.exports = { withRetry };
