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

  await recalibrateRiskBudgets();

  logger.info('=== Weekly Weight Calibration End ===');
}

// Phase C / Fix 7: continuous per-strategy risk budget multiplier.
// We look at the strategy's 90-day GLOBAL slice and blend its expectancy toward
// the configured baseline. multiplier = clamp(expectancy / baseline, min, max),
// then soften with RISK_BUDGET_BLEND to avoid whip-sawing size on a single week.
// Sizing-only (open question #4): this never influences the confidence gate.
async function recalibrateRiskBudgets() {
  if (!config.risk_budget_enabled) {
    logger.info('Risk budget recalibration: flag off — skipping');
    return;
  }
  logger.info('Running risk budget recalibration...');

  const slices = await getStrategyPerformanceSlices(90);
  const global_slices = slices.filter((s) => s.scope_type === 'GLOBAL' && s.scope_value === 'ALL');
  if (global_slices.length === 0) {
    logger.info('Risk budget: no GLOBAL strategy slices available — skipping');
    return;
  }

  const baseline = Math.max(0.01, Number.parseFloat(config.risk_budget_baseline_expectancy) || 0.3);
  const blend = Math.max(0, Math.min(1, Number.parseFloat(config.risk_budget_blend) || 0.3));
  const min_mult = Number.parseFloat(config.risk_budget_min_multiplier) || 0.5;
  const max_mult = Number.parseFloat(config.risk_budget_max_multiplier) || 1.5;
  const min_trades = Number.parseInt(config.risk_budget_min_trades || 20, 10);

  for (const slice of global_slices) {
    const strategy = slice.strategy_name;
    const trade_count = Number.parseInt(slice.trade_count, 10) || 0;
    const expectancy = Number.parseFloat(slice.expectancy_pct) || 0;

    if (trade_count < min_trades) {
      logger.info(
        `Risk budget [${strategy}]: ${trade_count}/${min_trades} trades — not enough data, leaving multiplier unchanged`
      );
      continue;
    }

    // Raw ratio of observed to baseline expectancy (baseline expressed as % matches expectancy_pct units).
    const ratio = expectancy / baseline;
    const clamped_ratio = Math.max(min_mult, Math.min(max_mult, ratio));
    // Blend against neutral (1.0) so we don't overreact to a single 90-day window.
    const blended = 1 * (1 - blend) + clamped_ratio * blend;
    const multiplier = roundDecimal(Math.max(min_mult, Math.min(max_mult, blended)), 2);

    await strategyConfigModel.updateRiskBudget(strategy, multiplier, trade_count, expectancy);
    logger.info(
      `Risk budget [${strategy}]: expectancy=${roundDecimal(expectancy, 4)}%, ratio=${roundDecimal(ratio, 3)}, ` +
      `clamped=${roundDecimal(clamped_ratio, 3)}, blended=${multiplier} (trades=${trade_count})`
    );
  }
}

// Phase B / Fix 3: we emit three slice levels so the signal service can use the
// finest available bucket at lookup time (STRATEGY_DIRECTION → STRATEGY → GLOBAL).
// The minimum-samples gate is the same across slices — the caller picks which to
// trust. We intentionally keep raw rows at every bucket (even sparse ones) so the
// fallback chain can still find coarser coverage when finer slices are thin.
async function calibrateConfidence() {
  logger.info('Running confidence calibration (per-strategy/direction slices)...');
  const MIN_BUCKET_ENTRIES = 20;
  const today = formatDate(new Date());

  const slices = [
    {
      label: 'GLOBAL',
      slice_level: 'GLOBAL',
      sql: `
        SELECT FLOOR(raw_confidence / 5) * 5 AS bucket,
               '*' AS strategy, '*' AS direction,
               COUNT(*) AS total,
               SUM(CASE WHEN outcome = 'TARGET_HIT' THEN 1 ELSE 0 END) AS wins
          FROM signal_outcomes
         WHERE raw_confidence IS NOT NULL
         GROUP BY bucket
      `,
    },
    {
      label: 'STRATEGY',
      slice_level: 'STRATEGY',
      sql: `
        SELECT FLOOR(so.raw_confidence / 5) * 5 AS bucket,
               UPPER(COALESCE(so.strategy, s.strategy_source)) AS strategy,
               '*' AS direction,
               COUNT(*) AS total,
               SUM(CASE WHEN so.outcome = 'TARGET_HIT' THEN 1 ELSE 0 END) AS wins
          FROM signal_outcomes so
          LEFT JOIN signals s ON s.id = so.signal_id
         WHERE so.raw_confidence IS NOT NULL
         GROUP BY bucket, strategy
      `,
    },
    {
      label: 'STRATEGY_DIRECTION',
      slice_level: 'STRATEGY_DIRECTION',
      sql: `
        SELECT FLOOR(so.raw_confidence / 5) * 5 AS bucket,
               UPPER(COALESCE(so.strategy, s.strategy_source)) AS strategy,
               UPPER(COALESCE(s.direction, 'LONG')) AS direction,
               COUNT(*) AS total,
               SUM(CASE WHEN so.outcome = 'TARGET_HIT' THEN 1 ELSE 0 END) AS wins
          FROM signal_outcomes so
          LEFT JOIN signals s ON s.id = so.signal_id
         WHERE so.raw_confidence IS NOT NULL
         GROUP BY bucket, strategy, direction
      `,
    },
  ];

  let total_upserted = 0;
  for (const slice of slices) {
    const [rows] = await pool.query(slice.sql);
    if (!rows || rows.length === 0) {
      logger.info(`[${slice.label}] no signal_outcomes data — skipping`);
      continue;
    }
    const sparse = rows.filter((r) => r.total < MIN_BUCKET_ENTRIES);
    if (sparse.length > 0) {
      logger.info(
        `[${slice.label}] ${sparse.length} sparse buckets (< ${MIN_BUCKET_ENTRIES}) — emitted but downstream may fall back`
      );
    }
    let upserted = 0;
    for (const row of rows) {
      const win_rate = row.total > 0 ? roundDecimal((row.wins / row.total) * 100, 2) : 0;
      await confidenceCalibrationModel.upsertBucket(row.bucket, row.total, win_rate, today, {
        slice_level: slice.slice_level,
        strategy: row.strategy || '*',
        direction: row.direction || '*',
      });
      upserted++;
    }
    logger.info(`[${slice.label}] upserted ${upserted} buckets`);
    total_upserted += upserted;
  }

  logger.info(`Confidence calibration complete — ${total_upserted} rows upserted across slices`);
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

module.exports = { calibrateWeights, evaluateStrategyPerformance, calibrateConfidence, recalibrateRiskBudgets };
