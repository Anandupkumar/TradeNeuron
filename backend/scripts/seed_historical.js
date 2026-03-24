const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const candleModel = require('../src/models/candle.model');
const { testConnection, gracefulShutdown } = require('../src/config/db');
const { logger } = require('../src/middlewares/logger.middleware');

const DATA_FILE = path.resolve(__dirname, 'yahoo_data.json');

async function seedHistorical() {
  await testConnection();

  if (!fs.existsSync(DATA_FILE)) {
    logger.error(`Data file not found: ${DATA_FILE}`);
    logger.info('Run the download script first: python3 scripts/download_yahoo_data.py');
    process.exit(1);
  }

  logger.info('Reading downloaded Yahoo data...');
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  const all_data = JSON.parse(raw);

  const symbols = Object.keys(all_data);
  logger.info(`Found data for ${symbols.length} symbols`);

  let success_count = 0;
  let total_candles = 0;

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    const candles = all_data[symbol];

    try {
      logger.info(`[${i + 1}/${symbols.length}] Inserting ${candles.length} candles for ${symbol}`);
      if (candles.length > 0) {
        await candleModel.bulkUpsert(candles);
        success_count++;
        total_candles += candles.length;
      }
    } catch (error) {
      logger.error(`  Failed ${symbol}: ${error.message}`);
    }
  }

  logger.info(`Seeding complete. Symbols: ${success_count}/${symbols.length}, Total candles: ${total_candles}`);
  await gracefulShutdown();
}

seedHistorical().catch((err) => {
  logger.error(`Seed script failed: ${err.message}`);
  process.exit(1);
});
