const { SCORING_WEIGHTS, VOLUME_TIER_SCORES } = require('../../config/constants');
const indicatorModel = require('../../models/indicator.model');
const featureModel = require('../../models/feature.model');
const { clamp } = require('../../utils/math.util');
const { pool } = require('../../config/db');

let cached_adaptive_weights = null;
let adaptive_weights_loaded_at = 0;
const CACHE_TTL_MS = 60 * 60 * 1000;

async function loadAdaptiveWeights() {
  const now = Date.now();
  if (cached_adaptive_weights && (now - adaptive_weights_loaded_at) < CACHE_TTL_MS) {
    return cached_adaptive_weights;
  }
  try {
    const [rows] = await pool.query(
      `SELECT weight_trend, weight_rsi, weight_volume, weight_breakout
       FROM adaptive_thresholds
       WHERE symbol = '_GLOBAL_' AND weight_trend IS NOT NULL
       ORDER BY date DESC LIMIT 1`
    );
    if (rows.length > 0) {
      const r = rows[0];
      cached_adaptive_weights = {
        trend: parseFloat(r.weight_trend),
        rsi: parseFloat(r.weight_rsi),
        volume: parseFloat(r.weight_volume),
        breakout: parseFloat(r.weight_breakout),
      };
    } else {
      cached_adaptive_weights = null;
    }
  } catch {
    cached_adaptive_weights = null;
  }
  adaptive_weights_loaded_at = now;
  return cached_adaptive_weights;
}

async function calculateScore(symbol, date) {
  const feature = await featureModel.findBySymbolAndDate(symbol, date);
  const indicator = await indicatorModel.findBySymbolAndDate(symbol, date);

  if (!feature || !indicator) return 0;

  const adaptive = await loadAdaptiveWeights();

  const w_trend = adaptive ? adaptive.trend : SCORING_WEIGHTS.TREND;
  const w_rsi = adaptive ? adaptive.rsi : SCORING_WEIGHTS.RSI_PULLBACK;
  const w_breakout = adaptive ? adaptive.breakout : SCORING_WEIGHTS.BREAKOUT;

  let score = 0;

  const is_uptrend = feature.is_uptrend === 1 || feature.is_uptrend === true;
  const ema_20 = indicator.ema_20 != null ? parseFloat(indicator.ema_20) : null;
  const ema_50 = indicator.ema_50 != null ? parseFloat(indicator.ema_50) : null;

  if (is_uptrend && ema_20 != null && ema_50 != null && ema_20 > ema_50) {
    score += w_trend;
  }

  if (feature.rsi_zone === 'PULLBACK') {
    score += w_rsi;
  }

  const volume_tier = feature.volume_tier || 'normal';
  if (adaptive) {
    const tier_multiplier = { extreme: 1.0, high: 0.67, elevated: 0.33, normal: 0 };
    score += adaptive.volume * (tier_multiplier[volume_tier] || 0);
  } else {
    score += VOLUME_TIER_SCORES[volume_tier] || 0;
  }

  const is_breakout = feature.is_breakout === 1 || feature.is_breakout === true;
  if (is_breakout) {
    score += w_breakout;
  }

  const is_high_delivery = feature.is_high_delivery === 1 || feature.is_high_delivery === true;
  if (is_high_delivery && is_breakout) {
    score += 10;
  }

  return clamp(score, 0, 100);
}

function mergeScores(scores) {
  const total = scores.reduce((sum, s) => sum + s, 0);
  return Math.min(total, 100);
}

module.exports = { calculateScore, mergeScores };
