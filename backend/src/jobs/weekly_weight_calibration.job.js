const { logger } = require('../middlewares/logger.middleware');
const { pool } = require('../config/db');
const { SCORING_WEIGHTS } = require('../config/constants');
const config = require('../config/env');
const signalOutcomeModel = require('../models/signal_outcome.model');
const { formatDate } = require('../utils/date.util');
const { roundDecimal } = require('../utils/math.util');

function computeAdaptiveWeight(base_weight, win_rate) {
  return roundDecimal(base_weight * (0.5 + win_rate), 2);
}

function blendWeight(base_weight, adaptive_weight, blend_factor) {
  return roundDecimal(base_weight * (1 - blend_factor) + adaptive_weight * blend_factor, 2);
}

async function calibrateWeights() {
  logger.info('=== Weekly Weight Calibration Start ===');

  const min_partial = config.adaptive_min_trades_partial;
  const min_full = config.adaptive_min_trades_full;
  const partial_blend = config.adaptive_partial_blend;

  const outcomes = await signalOutcomeModel.findRecent(90);
  if (outcomes.length < min_partial) {
    logger.info(`Insufficient outcomes (${outcomes.length}/${min_partial} required) — skipping calibration`);
    return;
  }

  const is_partial = outcomes.length < min_full;

  const feature_wins = { trend: 0, rsi: 0, volume: 0, breakout: 0 };
  const feature_totals = { trend: 0, rsi: 0, volume: 0, breakout: 0 };
  const is_win = (o) => o.outcome === 'TARGET_HIT';

  for (const outcome of outcomes) {
    let features = outcome.features_json;
    if (typeof features === 'string') {
      try { features = JSON.parse(features); } catch { continue; }
    }
    if (!features) continue;

    const uptrend = features.is_uptrend === 1 || features.is_uptrend === true;
    if (uptrend) {
      feature_totals.trend++;
      if (is_win(outcome)) feature_wins.trend++;
    }

    if (features.rsi_zone === 'PULLBACK') {
      feature_totals.rsi++;
      if (is_win(outcome)) feature_wins.rsi++;
    }

    const volume_spike = features.is_volume_spike === 1 || features.is_volume_spike === true;
    if (volume_spike) {
      feature_totals.volume++;
      if (is_win(outcome)) feature_wins.volume++;
    }

    const breakout = features.is_breakout === 1 || features.is_breakout === true;
    if (breakout) {
      feature_totals.breakout++;
      if (is_win(outcome)) feature_wins.breakout++;
    }
  }

  const win_rates = {};
  for (const key of Object.keys(feature_totals)) {
    win_rates[key] = feature_totals[key] > 0
      ? feature_wins[key] / feature_totals[key]
      : 0.5;
  }

  const adaptive_trend = computeAdaptiveWeight(SCORING_WEIGHTS.TREND, win_rates.trend);
  const adaptive_rsi = computeAdaptiveWeight(SCORING_WEIGHTS.RSI_PULLBACK, win_rates.rsi);
  const adaptive_volume = computeAdaptiveWeight(30, win_rates.volume);
  const adaptive_breakout = computeAdaptiveWeight(SCORING_WEIGHTS.BREAKOUT, win_rates.breakout);

  let weight_trend, weight_rsi, weight_volume, weight_breakout;
  if (is_partial) {
    weight_trend = blendWeight(SCORING_WEIGHTS.TREND, adaptive_trend, partial_blend);
    weight_rsi = blendWeight(SCORING_WEIGHTS.RSI_PULLBACK, adaptive_rsi, partial_blend);
    weight_volume = blendWeight(30, adaptive_volume, partial_blend);
    weight_breakout = blendWeight(SCORING_WEIGHTS.BREAKOUT, adaptive_breakout, partial_blend);
    logger.info(`Partial calibration (${outcomes.length} outcomes, ${partial_blend * 100}% blend)`);
  } else {
    weight_trend = adaptive_trend;
    weight_rsi = adaptive_rsi;
    weight_volume = adaptive_volume;
    weight_breakout = adaptive_breakout;
    logger.info(`Full calibration (${outcomes.length} outcomes, 100% blend)`);
  }

  const today = formatDate(new Date());
  const symbol = '_GLOBAL_';

  const sql = `
    INSERT INTO adaptive_thresholds (symbol, date, weight_trend, weight_rsi, weight_volume, weight_breakout)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      weight_trend = VALUES(weight_trend),
      weight_rsi = VALUES(weight_rsi),
      weight_volume = VALUES(weight_volume),
      weight_breakout = VALUES(weight_breakout)
  `;
  await pool.query(sql, [symbol, today, weight_trend, weight_rsi, weight_volume, weight_breakout]);

  logger.info(`Calibration complete — trend=${weight_trend}, rsi=${weight_rsi}, volume=${weight_volume}, breakout=${weight_breakout}`);
  logger.info(`Win rates — trend=${roundDecimal(win_rates.trend, 3)}, rsi=${roundDecimal(win_rates.rsi, 3)}, volume=${roundDecimal(win_rates.volume, 3)}, breakout=${roundDecimal(win_rates.breakout, 3)}`);
  logger.info('=== Weekly Weight Calibration End ===');
}

module.exports = { calibrateWeights };
