const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const REQUIRED_VARS = [
  'PORT', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME',
  'API_KEY', 'CRON_SCHEDULE', 'CRON_TIMEZONE', 'FUNDAMENTAL_CRON_SCHEDULE',
  'VIX_THRESHOLD', 'MIN_LIQUIDITY_VOLUME', 'MIN_CONFIDENCE', 'MIN_RISK_REWARD',
  'TOTAL_CAPITAL_INR', 'RISK_PCT_PER_TRADE'
];

const missing = REQUIRED_VARS.filter((key) => process.env[key] === undefined);
if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const config = Object.freeze({
  port: parseInt(process.env.PORT, 10),
  node_env: process.env.NODE_ENV || 'development',
  api_key: process.env.API_KEY,

  db_host: process.env.DB_HOST,
  db_port: parseInt(process.env.DB_PORT, 10),
  db_user: process.env.DB_USER,
  db_password: process.env.DB_PASSWORD,
  db_name: process.env.DB_NAME,
  db_connection_limit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),

  yahoo_throttle_ms: parseInt(process.env.YAHOO_THROTTLE_MS || '300', 10),
  yahoo_max_retries: parseInt(process.env.YAHOO_MAX_RETRIES || '3', 10),
  yahoo_backoff_base_ms: parseInt(process.env.YAHOO_BACKOFF_BASE_MS || '1000', 10),

  cron_schedule: process.env.CRON_SCHEDULE,
  cron_timezone: process.env.CRON_TIMEZONE,
  pipeline_timeout_ms: parseInt(process.env.PIPELINE_TIMEOUT_MS || '300000', 10),

  min_confidence: parseFloat(process.env.MIN_CONFIDENCE),
  min_risk_reward: parseFloat(process.env.MIN_RISK_REWARD),
  max_active_signals: parseInt(process.env.MAX_ACTIVE_SIGNALS || '10', 10),
  max_sector_signals: parseInt(process.env.MAX_SECTOR_SIGNALS || '3', 10),
  holding_period_days: parseInt(process.env.HOLDING_PERIOD_DAYS || '10', 10),

  vix_threshold: parseFloat(process.env.VIX_THRESHOLD),

  min_liquidity_volume: parseInt(process.env.MIN_LIQUIDITY_VOLUME, 10),

  fundamental_cron_schedule: process.env.FUNDAMENTAL_CRON_SCHEDULE,
  max_debt_to_equity: parseFloat(process.env.MAX_DEBT_TO_EQUITY || '2.0'),
  min_eps_growth_consecutive_negative: parseInt(process.env.MIN_EPS_GROWTH_CONSECUTIVE_NEGATIVE || '2', 10),
  min_revenue_growth_consecutive_negative: parseInt(process.env.MIN_REVENUE_GROWTH_CONSECUTIVE_NEGATIVE || '2', 10),
  max_promoter_pledge_pct: parseFloat(process.env.MAX_PROMOTER_PLEDGE_PCT || '50'),

  sentiment_lookback_days: parseInt(process.env.SENTIMENT_LOOKBACK_DAYS || '7', 10),

  slippage_pct: parseFloat(process.env.SLIPPAGE_PCT || '0.1'),
  brokerage_pct: parseFloat(process.env.BROKERAGE_PCT || '0.05'),

  total_capital_inr: parseFloat(process.env.TOTAL_CAPITAL_INR),
  risk_pct_per_trade: parseFloat(process.env.RISK_PCT_PER_TRADE),
  max_position_pct: parseFloat(process.env.MAX_POSITION_PCT || '10'),
  max_position_pct_short: parseFloat(process.env.MAX_POSITION_PCT_SHORT || '5'),

  adaptive_thresholds_enabled: (process.env.ADAPTIVE_THRESHOLDS_ENABLED || 'true').toLowerCase() === 'true',
  adaptive_min_data_points: parseInt(process.env.ADAPTIVE_MIN_DATA_POINTS || '30', 10),

  finnhub_api_key: process.env.FINNHUB_API_KEY || '',

  log_level: process.env.LOG_LEVEL || 'info',
  log_dir: process.env.LOG_DIR || './logs',
});

module.exports = config;
