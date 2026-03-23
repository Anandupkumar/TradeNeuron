const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { fetchYahooCandles } = require('../src/services/data_ingestion/yahoo.service');
const candleModel = require('../src/models/candle.model');
const { nifty_50_symbols, nifty_index_symbol, india_vix_symbol } = require('../src/utils/symbols.util');
const { testConnection, gracefulShutdown } = require('../src/config/db');
const { logger } = require('../src/middlewares/logger.middleware');
const { formatDate, getDateNYearsAgo } = require('../src/utils/date.util');

const ALL_SYMBOLS = [...nifty_50_symbols, nifty_index_symbol, india_vix_symbol];
const DELAY_BETWEEN_SYMBOLS_MS = 2000;
const RATE_LIMIT_COOLDOWN_MS = 60000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimited(msg) {
  return msg.includes('Too Many Requests') || msg.includes('429');
}

async function seedHistorical() {
  await testConnection();

  const end_date = formatDate(new Date());
  const start_date = formatDate(getDateNYearsAgo(3));

  logger.info(`Seeding historical data from ${start_date} to ${end_date} for ${ALL_SYMBOLS.length} symbols`);
  logger.info(`Delay between symbols: ${DELAY_BETWEEN_SYMBOLS_MS}ms`);

  let success_count = 0;
  let fail_count = 0;
  let consecutive_rate_limits = 0;

  for (let i = 0; i < ALL_SYMBOLS.length; i++) {
    const symbol = ALL_SYMBOLS[i];
    try {
      logger.info(`[${i + 1}/${ALL_SYMBOLS.length}] Fetching: ${symbol}`);
      const candles = await fetchYahooCandles(symbol, start_date, end_date);

      if (candles.length > 0) {
        await candleModel.bulkUpsert(candles);
        logger.info(`  Stored ${candles.length} candles for ${symbol}`);
        success_count++;
        consecutive_rate_limits = 0;
      } else {
        logger.warn(`  No candles returned for ${symbol}`);
      }
    } catch (error) {
      logger.error(`  Failed ${symbol}: ${error.message}`);
      fail_count++;

      if (isRateLimited(error.message)) {
        consecutive_rate_limits++;
        const cooldown = RATE_LIMIT_COOLDOWN_MS * consecutive_rate_limits;
        logger.warn(`  Rate limited (${consecutive_rate_limits}x in a row). Cooling down ${Math.round(cooldown / 1000)}s...`);
        await sleep(cooldown);
      }
    }

    if (i < ALL_SYMBOLS.length - 1) {
      await sleep(DELAY_BETWEEN_SYMBOLS_MS);
    }
  }

  logger.info(`Seeding complete. Success: ${success_count}, Failed: ${fail_count}`);
  await gracefulShutdown();
}

seedHistorical().catch((err) => {
  logger.error(`Seed script failed: ${err.message}`);
  process.exit(1);
});
