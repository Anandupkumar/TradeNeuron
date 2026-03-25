const { logger } = require('../middlewares/logger.middleware');
const { pool } = require('../config/db');
const { SCORING_WEIGHTS } = require('../config/constants');
const config = require('../config/env');
const signalOutcomeModel = require('../models/signal_outcome.model');
const strategyConfigModel = require('../models/strategy_config.model');
const { formatDate } = require('../utils/date.util');
const { roundDecimal } = require('../utils/math.util');
const { sendTelegramAlert } = require('../utils/notify.util');

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

  await evaluateStrategyPerformance();

  logger.info('=== Weekly Weight Calibration End ===');
}

async function evaluateStrategyPerformance() {
  logger.info('Evaluating per-strategy performance from paper trades...');

  const [strategyStats] = await pool.query(`
    SELECT s.strategy_source,
           COUNT(*) as total,
           SUM(CASE WHEN pt.exit_reason = 'TARGET_HIT' THEN 1 ELSE 0 END) as wins,
           AVG(pt.pnl_pct) as avg_pnl
    FROM paper_trades pt
    JOIN signals s ON s.id = pt.signal_id
    WHERE pt.status = 'CLOSED'
      AND pt.exit_date >= DATE_SUB(NOW(), INTERVAL 90 DAY)
    GROUP BY s.strategy_source
    HAVING total >= 10
  `);

  if (strategyStats.length === 0) {
    logger.info('No strategy has enough closed paper trades (>= 10) for evaluation');
    return;
  }

  const disable_win_rate = config.strategy_disable_win_rate;
  const disable_min_trades = config.strategy_disable_min_trades;
  const reenable_win_rate = config.strategy_reenable_win_rate;
  const reenable_min_trades = config.strategy_reenable_min_trades;

  const current_config = await strategyConfigModel.getAll();
  const enabled_map = {};
  for (const row of current_config) {
    enabled_map[row.strategy_name] = row.is_enabled === 1;
  }

  for (const stat of strategyStats) {
    const win_rate = stat.wins / stat.total;
    const strategy = stat.strategy_source;
    const is_currently_enabled = enabled_map[strategy] !== false;

    logger.info(`Strategy ${strategy}: ${stat.total} trades, win rate ${roundDecimal(win_rate * 100, 1)}%, avg PnL ${roundDecimal(Number(stat.avg_pnl), 2)}%`);

    if (is_currently_enabled && win_rate < disable_win_rate && stat.total >= disable_min_trades) {
      const reason = `Win rate ${roundDecimal(win_rate * 100, 1)}% (${stat.wins}/${stat.total}) below ${disable_win_rate * 100}% threshold`;
      await strategyConfigModel.setEnabled(strategy, false, reason);
      logger.warn(`Strategy ${strategy} AUTO-DISABLED: ${reason}`);
      await sendTelegramAlert(`⚠️ Strategy ${strategy} auto-disabled — win rate: ${roundDecimal(win_rate * 100, 1)}% over ${stat.total} trades`);
    }

    if (!is_currently_enabled && win_rate >= reenable_win_rate && stat.total >= reenable_min_trades) {
      await strategyConfigModel.setEnabled(strategy, true);
      logger.info(`Strategy ${strategy} AUTO-RE-ENABLED: win rate ${roundDecimal(win_rate * 100, 1)}% over ${stat.total} trades`);
      await sendTelegramAlert(`✅ Strategy ${strategy} auto-re-enabled — win rate: ${roundDecimal(win_rate * 100, 1)}% over ${stat.total} trades`);
    }
  }
}

module.exports = { calibrateWeights, evaluateStrategyPerformance };
