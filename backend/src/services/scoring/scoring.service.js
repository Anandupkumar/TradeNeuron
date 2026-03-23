const { SCORING_WEIGHTS } = require('../../config/constants');
const indicatorModel = require('../../models/indicator.model');
const featureModel = require('../../models/feature.model');
const { clamp } = require('../../utils/math.util');

async function calculateScore(symbol, date) {
  const feature = await featureModel.findBySymbolAndDate(symbol, date);
  const indicator = await indicatorModel.findBySymbolAndDate(symbol, date);

  if (!feature || !indicator) return 0;

  let score = 0;

  const is_uptrend = feature.is_uptrend === 1 || feature.is_uptrend === true;
  const ema_20 = indicator.ema_20 != null ? parseFloat(indicator.ema_20) : null;
  const ema_50 = indicator.ema_50 != null ? parseFloat(indicator.ema_50) : null;

  if (is_uptrend && ema_20 != null && ema_50 != null && ema_20 > ema_50) {
    score += SCORING_WEIGHTS.TREND;
  }

  if (feature.rsi_zone === 'PULLBACK') {
    score += SCORING_WEIGHTS.RSI_PULLBACK;
  }

  const is_volume_spike = feature.is_volume_spike === 1 || feature.is_volume_spike === true;
  if (is_volume_spike) {
    score += SCORING_WEIGHTS.VOLUME_SPIKE;
  }

  const is_breakout = feature.is_breakout === 1 || feature.is_breakout === true;
  if (is_breakout) {
    score += SCORING_WEIGHTS.BREAKOUT;
  }

  return clamp(score, 0, 100);
}

function mergeScores(scores) {
  const total = scores.reduce((sum, s) => sum + s, 0);
  return Math.min(total, 100);
}

module.exports = { calculateScore, mergeScores };
