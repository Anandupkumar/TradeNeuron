const { logger } = require('../middlewares/logger.middleware');
const { pool } = require('../config/db');
const { SCORING_WEIGHTS } = require('../config/constants');
const signalOutcomeModel = require('../models/signal_outcome.model');
const { formatDate } = require('../utils/date.util');
const { roundDecimal } = require('../utils/math.util');

function computeAdaptiveWeight(base_weight, win_rate) {
  return roundDecimal(base_weight * (0.5 + win_rate), 2);
}

async function calibrateWeights() {
  logger.info('=== Weekly Weight Calibration Start ===');

  const outcomes = await signalOutcomeModel.findRecent(90);
  if (outcomes.length < 30) {
    logger.info(`Insufficient outcomes (${outcomes.length}/30 required) — skipping calibration`);
    return;
  }

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

  const weight_trend = computeAdaptiveWeight(SCORING_WEIGHTS.TREND, win_rates.trend);
  const weight_rsi = computeAdaptiveWeight(SCORING_WEIGHTS.RSI_PULLBACK, win_rates.rsi);
  const weight_volume = computeAdaptiveWeight(30, win_rates.volume);
  const weight_breakout = computeAdaptiveWeight(SCORING_WEIGHTS.BREAKOUT, win_rates.breakout);

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
