const { logger } = require('../middlewares/logger.middleware');
const { pool } = require('../config/db');
const { SCORING_WEIGHTS } = require('../config/constants');
const config = require('../config/env');
const signalOutcomeModel = require('../models/signal_outcome.model');
const strategyConfigModel = require('../models/strategy_config.model');
const confidenceCalibrationModel = require('../models/confidence_calibration.model');
const strategyPerformanceSnapshotModel = require('../models/strategy_performance_snapshot.model');
const { formatDate } = require('../utils/date.util');
const { roundDecimal } = require('../utils/math.util');
const { sendTelegramAlert } = require('../utils/notify.util');
const { getStrategyPerformanceSlices } = require('../services/analytics/performance_analytics.service');

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

  await calibrateConfidence();

  logger.info('=== Weekly Weight Calibration End ===');
}

async function calibrateConfidence() {
  logger.info('Running confidence calibration...');
  const MIN_BUCKET_ENTRIES = 20;

  const [rows] = await pool.query(`
    SELECT
      FLOOR(raw_confidence / 5) * 5 AS bucket,
      COUNT(*)                       AS total,
      SUM(CASE WHEN outcome = 'TARGET_HIT' THEN 1 ELSE 0 END) AS wins
    FROM signal_outcomes
    WHERE raw_confidence IS NOT NULL
    GROUP BY bucket
    ORDER BY bucket
  `);

  if (rows.length === 0) {
    logger.info('No signal_outcomes data — skipping confidence calibration');
    return;
  }

  const has_sparse_bucket = rows.some((r) => r.total < MIN_BUCKET_ENTRIES);
  if (has_sparse_bucket) {
    const sparse = rows.filter((r) => r.total < MIN_BUCKET_ENTRIES).map((r) => `${r.bucket}(${r.total})`);
    logger.info(`Sparse buckets (< ${MIN_BUCKET_ENTRIES} entries): ${sparse.join(', ')} — calibrating available buckets only`);
  }

  const today = formatDate(new Date());
  let upserted = 0;

  for (const row of rows) {
    if (row.total < MIN_BUCKET_ENTRIES) continue;
    const win_rate = roundDecimal((row.wins / row.total) * 100, 2);
    await confidenceCalibrationModel.upsertBucket(row.bucket, row.total, win_rate, today);
    upserted++;
    logger.info(`Calibration bucket ${row.bucket}: ${row.total} signals, win rate ${win_rate}%`);
  }

  logger.info(`Confidence calibration complete — ${upserted} buckets updated`);
}

async function evaluateStrategyPerformance() {
  logger.info('Evaluating per-strategy performance from paper trades...');

  const slices = await getStrategyPerformanceSlices(90);
  if (slices.length === 0) {
    logger.info('No strategy slices available for evaluation');
    return;
  }

  const current_config = await strategyConfigModel.getAll();
  const enabled_map = {};
  for (const row of current_config) {
    enabled_map[row.strategy_name] = row.is_enabled === 1;
  }

  const today = formatDate(new Date());
  for (const slice of slices) {
    await strategyPerformanceSnapshotModel.upsert({
      snapshot_date: today,
      strategy_name: slice.strategy_name,
      scope_type: slice.scope_type,
      scope_value: slice.scope_value,
      trade_count: slice.trade_count,
      win_rate_pct: slice.win_rate_pct,
      avg_pnl_pct: slice.avg_pnl_pct,
      profit_factor: slice.profit_factor,
      expectancy_pct: slice.expectancy_pct,
      max_drawdown_pct: slice.max_drawdown_pct,
      recommendation: slice.recommendation,
      recommendation_reason: slice.recommendation_reason,
      applied: false,
    });

    logger.info(
      `Strategy slice ${slice.strategy_name} [${slice.scope_type}:${slice.scope_value}] ` +
      `trades=${slice.trade_count}, win_rate=${slice.win_rate_pct}%, ` +
      `pf=${slice.profit_factor}, expectancy=${slice.expectancy_pct}%, ` +
      `recommendation=${slice.recommendation}`
    );

    const is_global = slice.scope_type === 'GLOBAL' && slice.scope_value === 'ALL';
    const is_currently_enabled = enabled_map[slice.strategy_name] !== false;
    if (
      is_global
      && config.strategy_pruning_auto_apply
      && is_currently_enabled
      && slice.recommendation === 'DISABLE'
    ) {
      await strategyConfigModel.setEnabled(slice.strategy_name, false, slice.recommendation_reason);
      logger.warn(`Strategy ${slice.strategy_name} AUTO-DISABLED: ${slice.recommendation_reason}`);
      await strategyPerformanceSnapshotModel.upsert({
        snapshot_date: today,
        strategy_name: slice.strategy_name,
        scope_type: slice.scope_type,
        scope_value: slice.scope_value,
        trade_count: slice.trade_count,
        win_rate_pct: slice.win_rate_pct,
        avg_pnl_pct: slice.avg_pnl_pct,
        profit_factor: slice.profit_factor,
        expectancy_pct: slice.expectancy_pct,
        max_drawdown_pct: slice.max_drawdown_pct,
        recommendation: slice.recommendation,
        recommendation_reason: slice.recommendation_reason,
        applied: true,
      });
      await sendTelegramAlert(`⚠️ Strategy ${slice.strategy_name} auto-disabled — ${slice.recommendation_reason}`);
    }
  }
}

module.exports = { calibrateWeights, evaluateStrategyPerformance, calibrateConfidence };
