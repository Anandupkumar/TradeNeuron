const { logger } = require('../../middlewares/logger.middleware');
const fundamentalModel = require('../../models/fundamental.model');

async function filterByFundamentals(signal_map) {
  const passed = {};

  for (const [symbol, signals] of Object.entries(signal_map)) {
    const is_healthy = await fundamentalModel.isHealthy(symbol);

    if (is_healthy) {
      passed[symbol] = signals;
    } else {
      logger.info(`Signal for ${symbol} rejected by fundamental filter`);
    }
  }

  return passed;
}

module.exports = { filterByFundamentals };
