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

async function seedHistorical() {
  await testConnection();

  const end_date = formatDate(new Date());
  const start_date = formatDate(getDateNYearsAgo(3));

  logger.info(`Seeding historical data from ${start_date} to ${end_date} for ${ALL_SYMBOLS.length} symbols`);

  let success_count = 0;
  let fail_count = 0;

  for (const symbol of ALL_SYMBOLS) {
    try {
      logger.info(`Fetching: ${symbol}`);
      const candles = await fetchYahooCandles(symbol, start_date, end_date);

      if (candles.length > 0) {
        await candleModel.bulkUpsert(candles);
        logger.info(`Stored ${candles.length} candles for ${symbol}`);
        success_count++;
      } else {
        logger.warn(`No candles returned for ${symbol}`);
      }
    } catch (error) {
      logger.error(`Failed to seed ${symbol}: ${error.message}`);
      fail_count++;
    }
  }

  logger.info(`Seeding complete. Success: ${success_count}, Failed: ${fail_count}`);
  await gracefulShutdown();
}

seedHistorical().catch((err) => {
  logger.error(`Seed script failed: ${err.message}`);
  process.exit(1);
});
