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
  vwap_max_bonus_cap: parseInt(process.env.VWAP_MAX_BONUS_CAP || '10', 10),

  finnhub_api_key: process.env.FINNHUB_API_KEY || '',

  frequency_controller_enabled: (process.env.FREQUENCY_CONTROLLER_ENABLED || 'true').toLowerCase() === 'true',
  target_weekly_signals: parseInt(process.env.TARGET_WEEKLY_SIGNALS || '10', 10),
  max_signals_per_day: parseInt(process.env.MAX_SIGNALS_PER_DAY || '3', 10),
  pool_min_confidence: parseFloat(process.env.POOL_MIN_CONFIDENCE || '60'),
  pool_min_risk_reward: parseFloat(process.env.POOL_MIN_RISK_REWARD || '1.5'),

  log_level: process.env.LOG_LEVEL || 'info',
  log_dir: process.env.LOG_DIR || './logs',

  max_sl_distance_pct: parseFloat(process.env.MAX_SL_DISTANCE_PCT || '6'),

  confidence_calibration_enabled: (process.env.CONFIDENCE_CALIBRATION_ENABLED || 'true').toLowerCase() === 'true',
  calibration_min_bucket_samples: parseInt(process.env.CALIBRATION_MIN_BUCKET_SAMPLES || '20', 10),
  calibration_prior_weight: parseInt(process.env.CALIBRATION_PRIOR_WEIGHT || '20', 10),

  earnings_blackout_enabled: (process.env.EARNINGS_BLACKOUT_ENABLED || 'true').toLowerCase() === 'true',

  sector_trend_penalty_enabled: (process.env.SECTOR_TREND_PENALTY_ENABLED || 'true').toLowerCase() === 'true',
  sector_trend_penalty_points: parseInt(process.env.SECTOR_TREND_PENALTY_POINTS || '10', 10),

  portfolio_risk_cap_enabled: (process.env.PORTFOLIO_RISK_CAP_ENABLED || 'true').toLowerCase() === 'true',
  max_portfolio_risk_pct: parseFloat(process.env.MAX_PORTFOLIO_RISK_PCT || '5'),

  correlation_position_scaling_enabled: (process.env.CORRELATION_POSITION_SCALING_ENABLED || 'true').toLowerCase() === 'true',

  regime_frequency_enabled: (process.env.REGIME_FREQUENCY_ENABLED || 'true').toLowerCase() === 'true',
  freq_mult_bullish: parseFloat(process.env.FREQ_MULT_BULLISH || '1.0'),
  freq_mult_bearish: parseFloat(process.env.FREQ_MULT_BEARISH || '0.7'),
  freq_mult_sideways: parseFloat(process.env.FREQ_MULT_SIDEWAYS || '0.6'),
  freq_mult_high_vol: parseFloat(process.env.FREQ_MULT_HIGH_VOL || '0'),

  drawdown_risk_scaling_enabled: (process.env.DRAWDOWN_RISK_SCALING_ENABLED || 'true').toLowerCase() === 'true',
  drawdown_threshold_high: parseFloat(process.env.DRAWDOWN_THRESHOLD_HIGH || '0.15'),
  drawdown_threshold_mid: parseFloat(process.env.DRAWDOWN_THRESHOLD_MID || '0.08'),
  drawdown_scale_severe: parseFloat(process.env.DRAWDOWN_SCALE_SEVERE || '0.5'),
  drawdown_scale_moderate: parseFloat(process.env.DRAWDOWN_SCALE_MODERATE || '0.75'),

  entry_freshness_enabled: (process.env.ENTRY_FRESHNESS_ENABLED || 'true').toLowerCase() === 'true',
  entry_degraded_drift_pct: parseFloat(process.env.ENTRY_DEGRADED_DRIFT_PCT || '2'),

  directional_exposure_enabled: (process.env.DIRECTIONAL_EXPOSURE_ENABLED || 'true').toLowerCase() === 'true',
  max_short_risk_share: parseFloat(process.env.MAX_SHORT_RISK_SHARE || '0.7'),

  futures_sl_buffer_enabled: (process.env.FUTURES_SL_BUFFER_ENABLED || 'true').toLowerCase() === 'true',
  futures_sl_buffer_factor: parseFloat(process.env.FUTURES_SL_BUFFER_FACTOR || '1.003'),

  vwma_api_alias_enabled: (process.env.VWMA_API_ALIAS_ENABLED || 'true').toLowerCase() === 'true',

  strategy_pruning_auto_apply: (process.env.STRATEGY_PRUNING_AUTO_APPLY || 'false').toLowerCase() === 'true',
  strategy_pruning_profit_factor_floor: parseFloat(process.env.STRATEGY_PRUNING_PROFIT_FACTOR_FLOOR || '1.0'),
  strategy_pruning_expectancy_floor: parseFloat(process.env.STRATEGY_PRUNING_EXPECTANCY_FLOOR || '0'),

  shadow_compare_enabled: (process.env.SHADOW_COMPARE_ENABLED || 'true').toLowerCase() === 'true',
  validation_min_shadow_days: parseInt(process.env.VALIDATION_MIN_SHADOW_DAYS || '15', 10),
  validation_min_shadow_overlap_pct: parseFloat(process.env.VALIDATION_MIN_SHADOW_OVERLAP_PCT || '50'),

  // --- Phase A: Partial-exit and dynamic frequency threshold ---
  partial_exit_enabled: (process.env.PARTIAL_EXIT_ENABLED || 'true').toLowerCase() === 'true',
  partial_exit_telegram_alerts: (process.env.PARTIAL_EXIT_TELEGRAM_ALERTS || 'true').toLowerCase() === 'true',
  // HARD_CAP (legacy) | DYNAMIC_THRESHOLD | HYBRID
  frequency_mode: (process.env.FREQUENCY_MODE || 'DYNAMIC_THRESHOLD').toUpperCase(),
  dynamic_floor_slope_points: parseFloat(process.env.DYNAMIC_FLOOR_SLOPE_POINTS || '10'),
  dynamic_floor_max: parseFloat(process.env.DYNAMIC_FLOOR_MAX || '85'),
  hybrid_soft_cap_multiplier: parseFloat(process.env.HYBRID_SOFT_CAP_MULTIPLIER || '1.5'),

  // --- Phase B: Per-strategy/direction calibration + return-correlation model ---
  calibration_per_strategy_enabled: (process.env.CALIBRATION_PER_STRATEGY_ENABLED || 'true').toLowerCase() === 'true',
  correlation_model_enabled: (process.env.CORRELATION_MODEL_ENABLED || 'true').toLowerCase() === 'true',
  correlation_divisor_threshold: parseFloat(process.env.CORRELATION_DIVISOR_THRESHOLD || '0.7'),
  correlation_lookback_days: parseInt(process.env.CORRELATION_LOOKBACK_DAYS || '20', 10),

  // --- Phase C: Volatility-compression exit + continuous per-strategy risk budget ---
  vol_compression_exit_enabled: (process.env.VOL_COMPRESSION_EXIT_ENABLED || 'true').toLowerCase() === 'true',
  vol_compression_trailing_window: parseInt(process.env.VOL_COMPRESSION_TRAILING_WINDOW || '60', 10),
  risk_budget_enabled: (process.env.RISK_BUDGET_ENABLED || 'true').toLowerCase() === 'true',
  risk_budget_min_trades: parseInt(process.env.RISK_BUDGET_MIN_TRADES || '20', 10),
  risk_budget_baseline_expectancy: parseFloat(process.env.RISK_BUDGET_BASELINE_EXPECTANCY || '0.3'),
  risk_budget_blend: parseFloat(process.env.RISK_BUDGET_BLEND || '0.3'),
  risk_budget_min_multiplier: parseFloat(process.env.RISK_BUDGET_MIN_MULTIPLIER || '0.5'),
  risk_budget_max_multiplier: parseFloat(process.env.RISK_BUDGET_MAX_MULTIPLIER || '1.5'),
});

module.exports = config;
