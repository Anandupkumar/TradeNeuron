const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { testConnection, gracefulShutdown } = require('../src/config/db');
const { logger } = require('../src/middlewares/logger.middleware');
const { runDailyPipeline } = require('../src/jobs/daily_pipeline.job');

async function main() {
  await testConnection();
  logger.info('Manual pipeline trigger — starting now');
  await runDailyPipeline();
  logger.info('Pipeline finished');
  await gracefulShutdown();
}

main().catch((err) => {
  logger.error(`Pipeline failed: ${err.message}`);
  process.exit(1);
});
