const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./src/config/env');
const { testConnection, gracefulShutdown } = require('./src/config/db');
const { logger, requestLogger } = require('./src/middlewares/logger.middleware');
const { errorHandler } = require('./src/middlewares/error_handler.middleware');
const { authenticateApiKey } = require('./src/middlewares/auth.middleware');
const { globalLimiter } = require('./src/middlewares/rate_limiter.middleware');
const { startCronJobs } = require('./src/jobs/cron');

const healthRoutes = require('./src/routes/health.routes');
const signalRoutes = require('./src/routes/signal.routes');
const stockRoutes = require('./src/routes/stock.routes');
const historyRoutes = require('./src/routes/history.routes');
const backtestRoutes = require('./src/routes/backtest.routes');
const favoriteRoutes = require('./src/routes/favorite.routes');
const paperTradeRoutes = require('./src/routes/paper_trade.routes');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);
app.use(globalLimiter);

app.use('/api/v1', healthRoutes);

app.use('/api/v1', authenticateApiKey);
app.use('/api/v1', signalRoutes);
app.use('/api/v1', stockRoutes);
app.use('/api/v1', historyRoutes);
app.use('/api/v1', backtestRoutes);
app.use('/api/v1', favoriteRoutes);
app.use('/api/v1', paperTradeRoutes);

app.use(errorHandler);

async function start() {
  await testConnection();
  startCronJobs();

  const server = app.listen(config.port, () => {
    logger.info(`TradeNeuron server running on port ${config.port}`);
  });

  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      await gracefulShutdown();
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

if (require.main === module) {
  start().catch((err) => {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  });
}

module.exports = app;
