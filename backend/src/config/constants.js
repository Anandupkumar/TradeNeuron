const SCORING_WEIGHTS = {
  TREND: 30,
  RSI_PULLBACK: 20,
  BREAKOUT: 20,
};

const SHORT_SCORING_WEIGHTS = {
  TREND: 30,
  RSI_OVERBOUGHT: 20,
  BREAKDOWN: 20,
};

const VOLUME_TIER_SCORES = {
  extreme: 30,
  high: 20,
  elevated: 10,
  normal: 0,
};

const NSE_HOLIDAYS = require('./nse_holidays.json');

const NEGATIVE_KEYWORDS = [
  'fraud', 'scam', 'probe', 'arrested', 'sebi notice', 'sebi order',
  'default', 'bankruptcy', 'penalty', 'downgrade', 'rating downgrade',
  'loss widens', 'profit warning', 'earnings miss', 'revenue miss',
  'promoter selling', 'insider selling', 'pledge', 'debt default',
  'investigation', 'raid', 'suspension', 'delisting',
];

const RSI_ZONES = {
  OVERSOLD: { min: 0, max: 30 },
  PULLBACK: { min: 30, max: 45 },
  NEUTRAL: { min: 45, max: 65 },
  OVERBOUGHT: { min: 65, max: 100 },
};

const SOFT_FILTER = {
  BREAKOUT_CLOSE_POSITION_HARD: 0.6,
  BREAKOUT_CLOSE_POSITION_SOFT: 0.75,
  BREAKOUT_SOFT_PENALTY: 10,
  TREND_SLOPE_PENALTY: 15,
  BREAKDOWN_CLOSE_POSITION_THRESHOLD: 0.4,
};

const NEGATION_WORDS = [
  'clears', 'cleared', 'acquitted', 'not guilty',
  'no evidence', 'dismissed', 'drops', 'resolved',
  'overturned', 'exonerated', 'withdrawn',
];

// Partial-exit policy keys (Phase A, Fix 1 + Fix 4):
//   partial_exit_rr                    — book first leg at this R-multiple of initial risk
//   partial_fraction                   — fraction of shares booked at partial (0..1)
//   move_sl_to_breakeven_after_partial — flip remainder SL to realistic entry price
//   trail_after_partial                — 'ATR' | 'NONE' (Fix 4: enable ATR trailing on remainder even for FIXED_RR)
// Volatility-compression keys (Phase C, Fix 6):
//   vol_compression_exit_enabled       — enable BW-percentile exit
//   vol_compression_bw_percentile      — BW percentile (over trailing 60d) below which to exit
//   min_bars_before_vol_exit           — only arm vol exit after this many bars held
const EXIT_POLICY_PROFILES = {
  TREND_PULLBACK: {
    kind: 'FIXED_RR',
    rr_multiple: 2.25,
    max_hold_days: 12,
    partial_exit_rr: 1.0,
    partial_fraction: 0.5,
    move_sl_to_breakeven_after_partial: true,
    trail_after_partial: 'ATR',
    trail_atr_multiple: 2.0,
  },
  BREAKOUT: {
    kind: 'TRAIL_ATR',
    rr_multiple: 3.0,
    trail_atr_multiple: 2.0,
    max_hold_days: 15,
    partial_exit_rr: 1.5,
    partial_fraction: 0.33,
    move_sl_to_breakeven_after_partial: true,
    trail_after_partial: 'ATR',
  },
  RANGE: {
    kind: 'LEVEL_TARGET',
    target_source: 'RANGE_RESISTANCE',
    max_hold_days: 8,
    partial_exit_rr: 1.0,
    partial_fraction: 0.5,
    move_sl_to_breakeven_after_partial: true,
    trail_after_partial: 'NONE',
    vol_compression_exit_enabled: true,
    vol_compression_bw_percentile: 15,
    min_bars_before_vol_exit: 3,
  },
  MEAN_REVERSION: {
    kind: 'LEVEL_TARGET',
    target_source: 'MEAN_REVERSION',
    max_hold_days: 6,
    partial_exit_rr: 0.7,
    partial_fraction: 0.5,
    move_sl_to_breakeven_after_partial: true,
    trail_after_partial: 'NONE',
    vol_compression_exit_enabled: true,
    vol_compression_bw_percentile: 15,
    min_bars_before_vol_exit: 2,
  },
  TREND_PULLBACK_SHORT: {
    kind: 'FIXED_RR',
    rr_multiple: 2.25,
    max_hold_days: 9,
    partial_exit_rr: 1.0,
    partial_fraction: 0.5,
    move_sl_to_breakeven_after_partial: true,
    trail_after_partial: 'ATR',
    trail_atr_multiple: 2.0,
  },
  BREAKDOWN: {
    kind: 'TRAIL_ATR',
    rr_multiple: 2.5,
    trail_atr_multiple: 2.0,
    max_hold_days: 10,
    partial_exit_rr: 1.5,
    partial_fraction: 0.33,
    move_sl_to_breakeven_after_partial: true,
    trail_after_partial: 'ATR',
  },
  COMBINED: {
    kind: 'FIXED_RR',
    rr_multiple: 2.2,
    max_hold_days: 12,
    partial_exit_rr: 1.0,
    partial_fraction: 0.5,
    move_sl_to_breakeven_after_partial: true,
    trail_after_partial: 'ATR',
    trail_atr_multiple: 2.0,
  },
};

const RANKING_WEIGHTS = {
  CONFIDENCE: 0.55,
  RELATIVE_STRENGTH: 0.2,
  SECTOR_ALIGNMENT: 0.1,
  DELIVERY_QUALITY: 0.075,
  SETUP_QUALITY: 0.075,
};

const RANKING_SCORE_BANDS = {
  STRONG_RS: 5,
  VERY_STRONG_RS: 10,
  WEAK_RS: -5,
  VERY_WEAK_RS: -10,
};

const REGIME_BREADTH_THRESHOLDS = {
  STRONG_BREADTH_PCT: 60,
  WEAK_BREADTH_PCT: 40,
  PERSISTENCE_WINDOW: 5,
};

const STRATEGY_RECOMMENDATIONS = {
  KEEP: 'KEEP',
  WATCH: 'WATCH',
  DISABLE: 'DISABLE',
};

const VALIDATION_CRITERIA = {
  MIN_SHADOW_DAYS: 15,
  MIN_SHADOW_OVERLAP_PCT: 50,
  MIN_PROFIT_FACTOR: 1.2,
  MIN_EXPECTANCY_PCT: 0.05,
  MAX_DRAWDOWN_PCT: 12,
};

module.exports = {
  SCORING_WEIGHTS,
  SHORT_SCORING_WEIGHTS,
  VOLUME_TIER_SCORES,
  SOFT_FILTER,
  NSE_HOLIDAYS,
  NEGATIVE_KEYWORDS,
  NEGATION_WORDS,
  RSI_ZONES,
  EXIT_POLICY_PROFILES,
  RANKING_WEIGHTS,
  RANKING_SCORE_BANDS,
  REGIME_BREADTH_THRESHOLDS,
  STRATEGY_RECOMMENDATIONS,
  VALIDATION_CRITERIA,
};
