const mysql = require('mysql2/promise');
const config = require('./env');
const logger = require('../middlewares/logger.middleware').logger;

const pool = mysql.createPool({
  host: config.db_host,
  port: config.db_port,
  user: config.db_user,
  password: config.db_password,
  database: config.db_name,
  connectionLimit: config.db_connection_limit,
  waitForConnections: true,
  queueLimit: 0,
  connectTimeout: 10000,
  enableKeepAlive: true,
  keepAliveInitialDelay: 30000,
});

async function testConnection() {
  try {
    await pool.query('SELECT 1');
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error(`Database connection failed: ${error.message}`);
    process.exit(1);
  }
}

async function gracefulShutdown() {
  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (error) {
    logger.error(`Error closing database pool: ${error.message}`);
  }
}

module.exports = { pool, testConnection, gracefulShutdown };
