const { logger } = require('../middlewares/logger.middleware');
const { nifty_50_symbols } = require('../utils/symbols.util');
const { refreshFundamentals } = require('../services/fundamentals/fundamental.service');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runWeeklyFundamentals() {
  logger.info('Starting weekly fundamental data refresh');
  let success_count = 0;
  let fail_count = 0;

  for (const symbol of nifty_50_symbols) {
    try {
      await refreshFundamentals(symbol);
      success_count++;
    } catch (error) {
      logger.error(`Fundamental refresh failed for ${symbol}: ${error.message}`);
      fail_count++;
    }
    await sleep(500);
  }

  logger.info(`Weekly fundamentals complete. Success: ${success_count}, Failed: ${fail_count}`);
}

module.exports = { runWeeklyFundamentals };
