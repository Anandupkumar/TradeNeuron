const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { testConnection, gracefulShutdown } = require('../src/config/db');
const { runBacktest } = require('../src/services/backtesting/backtest.service');
const { logger } = require('../src/middlewares/logger.middleware');

const WINDOWS = [
  { train_start: '2023-01-01', train_end: '2023-12-31', test_start: '2024-01-01', test_end: '2024-06-30' },
  { train_start: '2023-07-01', train_end: '2024-06-30', test_start: '2024-07-01', test_end: '2024-12-31' },
  { train_start: '2024-01-01', train_end: '2024-12-31', test_start: '2025-01-01', test_end: '2025-06-30' },
  { train_start: '2024-07-01', train_end: '2025-06-30', test_start: '2025-07-01', test_end: '2025-12-31' },
];

async function main() {
  await testConnection();

  for (const window of WINDOWS) {
    logger.info(`Running backtest window: ${window.test_start} to ${window.test_end}`);
    try {
      await runBacktest(window.train_start, window.train_end, window.test_start, window.test_end);
    } catch (error) {
      logger.error(`Backtest window failed: ${error.message}`);
    }
  }

  await gracefulShutdown();
  logger.info('Backtest complete');
}

main().catch((err) => {
  logger.error(`Backtest script failed: ${err.message}`);
  process.exit(1);
});
