const cron = require('node-cron');
const config = require('../config/env');
const { logger } = require('../middlewares/logger.middleware');
const { runDailyPipeline } = require('./daily_pipeline.job');
const { runWeeklyFundamentals } = require('./weekly_fundamentals.job');

function startCronJobs() {
  cron.schedule(config.cron_schedule, async () => {
    logger.info('Cron trigger: Daily pipeline');
    try {
      await runDailyPipeline();
    } catch (error) {
      logger.error(`Daily pipeline cron error: ${error.message}`);
    }
  }, {
    timezone: config.cron_timezone,
  });

  cron.schedule(config.fundamental_cron_schedule, async () => {
    logger.info('Cron trigger: Weekly fundamentals refresh');
    try {
      await runWeeklyFundamentals();
    } catch (error) {
      logger.error(`Weekly fundamentals cron error: ${error.message}`);
    }
  }, {
    timezone: config.cron_timezone,
  });

  logger.info(`Cron jobs registered: daily pipeline [${config.cron_schedule}], weekly fundamentals [${config.fundamental_cron_schedule}] (${config.cron_timezone})`);
}

module.exports = { startCronJobs };
