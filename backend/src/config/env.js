const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const REQUIRED_VARS = [
  'PORT', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME',
  'API_KEY', 'CRON_SCHEDULE', 'CRON_TIMEZONE', 'FUNDAMENTAL_CRON_SCHEDULE',
  'VIX_THRESHOLD', 'MIN_CONFIDENCE', 'MIN_RISK_REWARD',
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

  min_liquidity_volume: parseInt(process.env.MIN_LIQUIDITY_VOLUME || '500000', 10),

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

  account_type: process.env.ACCOUNT_TYPE || 'EQUITY',

  adaptive_thresholds_enabled: (process.env.ADAPTIVE_THRESHOLDS_ENABLED || 'true').toLowerCase() === 'true',
  adaptive_min_data_points: parseInt(process.env.ADAPTIVE_MIN_DATA_POINTS || '30', 10),
  adaptive_min_trades_partial: parseInt(process.env.ADAPTIVE_MIN_TRADES_PARTIAL || '15', 10),
  adaptive_min_trades_full: parseInt(process.env.ADAPTIVE_MIN_TRADES_FULL || '30', 10),
  adaptive_partial_blend: parseFloat(process.env.ADAPTIVE_PARTIAL_BLEND || '0.3'),

  confidence_tier_high: parseFloat(process.env.CONFIDENCE_TIER_HIGH || '85'),
  confidence_tier_normal: parseFloat(process.env.CONFIDENCE_TIER_NORMAL || '75'),
  confidence_tier_low: parseFloat(process.env.CONFIDENCE_TIER_LOW || '70'),

  expired_min_penalty: parseFloat(process.env.EXPIRED_MIN_PENALTY || '-0.1'),
  expired_max_penalty: parseFloat(process.env.EXPIRED_MAX_PENALTY || '-0.2'),
  expired_movement_threshold: parseFloat(process.env.EXPIRED_MOVEMENT_THRESHOLD || '1.0'),

  strategy_disable_win_rate: parseFloat(process.env.STRATEGY_DISABLE_WIN_RATE || '0.40'),
  strategy_disable_min_trades: parseInt(process.env.STRATEGY_DISABLE_MIN_TRADES || '15', 10),
  strategy_reenable_win_rate: parseFloat(process.env.STRATEGY_REENABLE_WIN_RATE || '0.50'),
  strategy_reenable_min_trades: parseInt(process.env.STRATEGY_REENABLE_MIN_TRADES || '20', 10),

  vwap_distance_long_default: parseFloat(process.env.VWAP_DISTANCE_LONG_DEFAULT || '2.0'),
  vwap_distance_breakout_long: parseFloat(process.env.VWAP_DISTANCE_BREAKOUT_LONG || '3.5'),
  vwap_distance_short_default: parseFloat(process.env.VWAP_DISTANCE_SHORT_DEFAULT || '2.0'),

  vwap_soft_penalty_long: parseFloat(process.env.VWAP_SOFT_PENALTY_LONG || '2.0'),
  vwap_hard_reject_long: parseFloat(process.env.VWAP_HARD_REJECT_LONG || '5.0'),
  vwap_soft_penalty_short: parseFloat(process.env.VWAP_SOFT_PENALTY_SHORT || '2.0'),
  vwap_hard_reject_short: parseFloat(process.env.VWAP_HARD_REJECT_SHORT || '5.0'),
  vwap_score_near: parseInt(process.env.VWAP_SCORE_NEAR || '3', 10),
  vwap_soft_penalty_moderate: parseInt(process.env.VWAP_SOFT_PENALTY_MODERATE || '3', 10),
  vwap_soft_penalty_below: parseInt(process.env.VWAP_SOFT_PENALTY_BELOW || '8', 10),
  vwap_breakout_rvol_min: parseFloat(process.env.VWAP_BREAKOUT_RVOL_MIN || '1.5'),
  vwap_trend_override_zone: parseFloat(process.env.VWAP_TREND_OVERRIDE_ZONE || '3.5'),
  min_ema50_slope: parseFloat(process.env.MIN_EMA50_SLOPE || '0.5'),
  vwap_max_bonus_cap: parseInt(process.env.VWAP_MAX_BONUS_CAP || '6', 10),

  finnhub_api_key: process.env.FINNHUB_API_KEY || '',

  frequency_controller_enabled: (process.env.FREQUENCY_CONTROLLER_ENABLED || 'true').toLowerCase() === 'true',
  target_weekly_signals: parseInt(process.env.TARGET_WEEKLY_SIGNALS || '10', 10),
  max_signals_per_day: parseInt(process.env.MAX_SIGNALS_PER_DAY || '3', 10),
  pool_min_confidence: parseFloat(process.env.POOL_MIN_CONFIDENCE || '65'),
  pool_min_risk_reward: parseFloat(process.env.POOL_MIN_RISK_REWARD || '1.5'),

  log_level: process.env.LOG_LEVEL || 'info',
  log_dir: process.env.LOG_DIR || './logs',
});

module.exports = config;
