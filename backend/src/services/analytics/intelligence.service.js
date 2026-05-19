const { pool } = require('../../config/db');
const config = require('../../config/env');
const { getSector } = require('../../utils/symbols.util');
const { roundDecimal } = require('../../utils/math.util');

function toFloat(value, decimals = 4) {
  if (value == null) return null;
  return roundDecimal(parseFloat(value), decimals);
}

function isWinningOutcome(outcome) {
  return outcome === 'TARGET_HIT' || outcome === 'PARTIAL_THEN_TARGET';
}

async function getCalibrationQualityByDateRange(from_date, to_date) {
  const [rows] = await pool.query(
    `SELECT raw_confidence, confidence_bucket, strategy, market_regime, outcome
     FROM signal_outcomes
     WHERE DATE(resolved_at) BETWEEN ? AND ?
       AND raw_confidence IS NOT NULL`,
    [from_date, to_date]
  );

  if (rows.length === 0) {
    return {
      sample_count: 0,
      expected_calibration_error: null,
      brier_score: null,
      by_strategy: [],
      by_regime: [],
    };
  }

  let brier_sum = 0;
  const bucket_map = new Map();
  const group_map = (key) => new Map();
  const strategy_map = group_map('strategy');
  const regime_map = group_map('market_regime');

  for (const row of rows) {
    const probability = Math.max(0, Math.min(1, parseFloat(row.raw_confidence) / 100));
    const actual = isWinningOutcome(row.outcome) ? 1 : 0;
    brier_sum += (probability - actual) ** 2;

    const bucket = row.confidence_bucket == null ? 'UNKNOWN' : String(row.confidence_bucket);
    const bucket_stats = bucket_map.get(bucket) || { total: 0, predicted_sum: 0, actual_sum: 0 };
    bucket_stats.total += 1;
    bucket_stats.predicted_sum += probability;
    bucket_stats.actual_sum += actual;
    bucket_map.set(bucket, bucket_stats);

    for (const [map, key] of [[strategy_map, row.strategy || 'UNKNOWN'], [regime_map, row.market_regime || 'UNKNOWN']]) {
      const stats = map.get(key) || { key, total: 0, predicted_sum: 0, actual_sum: 0 };
      stats.total += 1;
      stats.predicted_sum += probability;
      stats.actual_sum += actual;
      map.set(key, stats);
    }
  }

  let ece = 0;
  for (const bucket of bucket_map.values()) {
    const predicted = bucket.predicted_sum / bucket.total;
    const actual = bucket.actual_sum / bucket.total;
    ece += (bucket.total / rows.length) * Math.abs(predicted - actual);
  }

  const normalizeGroups = (map) => Array.from(map.values())
    .map((item) => ({
      key: item.key,
      total: item.total,
      predicted_win_rate_pct: roundDecimal((item.predicted_sum / item.total) * 100, 2),
      actual_win_rate_pct: roundDecimal((item.actual_sum / item.total) * 100, 2),
      calibration_error_pct: roundDecimal(Math.abs((item.predicted_sum / item.total) - (item.actual_sum / item.total)) * 100, 2),
    }))
    .sort((a, b) => b.total - a.total);

  return {
    sample_count: rows.length,
    expected_calibration_error: roundDecimal(ece, 4),
    brier_score: roundDecimal(brier_sum / rows.length, 4),
    by_strategy: normalizeGroups(strategy_map),
    by_regime: normalizeGroups(regime_map),
  };
}

async function getRegimeProbabilityByDateRange(from_date, to_date) {
  const [rows] = await pool.query(
    `SELECT market_regime, COUNT(*) AS count
     FROM signals
     WHERE date BETWEEN ? AND ?
     GROUP BY market_regime`,
    [from_date, to_date]
  );
  const total = rows.reduce((sum, row) => sum + (parseInt(row.count, 10) || 0), 0);
  const probabilities = {};
  for (const regime of ['BULLISH', 'SIDEWAYS', 'BEARISH', 'HIGH_VOLATILITY', 'UNKNOWN']) {
    const row = rows.find((item) => item.market_regime === regime);
    const count = row ? parseInt(row.count, 10) || 0 : 0;
    probabilities[`${regime.toLowerCase()}_probability`] = total > 0 ? roundDecimal(count / total, 4) : 0;
  }
  return { sample_count: total, ...probabilities };
}

async function getPortfolioRiskSnapshot() {
  const [active_rows] = await pool.query(
    `SELECT symbol, direction, capital_risk_inr, position_value
     FROM signals
     WHERE status = 'ACTIVE'`
  );
  const total_capital_risk_inr = active_rows.reduce((sum, row) => sum + (parseFloat(row.capital_risk_inr) || 0), 0);
  const total_position_value = active_rows.reduce((sum, row) => sum + (parseFloat(row.position_value) || 0), 0);
  const by_direction = {};
  const by_sector = {};

  for (const row of active_rows) {
    by_direction[row.direction || 'UNKNOWN'] = (by_direction[row.direction || 'UNKNOWN'] || 0) + (parseFloat(row.capital_risk_inr) || 0);
    const sector = getSector(row.symbol) || 'UNKNOWN';
    by_sector[sector] = (by_sector[sector] || 0) + (parseFloat(row.capital_risk_inr) || 0);
  }

  const concentration_base = total_capital_risk_inr > 0 ? total_capital_risk_inr : 1;
  const max_sector_risk = Math.max(0, ...Object.values(by_sector));

  return {
    active_signals: active_rows.length,
    total_capital_risk_inr: roundDecimal(total_capital_risk_inr, 2),
    total_position_value: roundDecimal(total_position_value, 2),
    active_risk_pct: config.total_capital_inr > 0
      ? roundDecimal((total_capital_risk_inr / config.total_capital_inr) * 100, 2)
      : 0,
    risk_concentration_score: roundDecimal(max_sector_risk / concentration_base, 4),
    by_direction: Object.entries(by_direction).map(([direction, capital_risk_inr]) => ({
      direction,
      capital_risk_inr: roundDecimal(capital_risk_inr, 2),
    })),
    by_sector: Object.entries(by_sector).map(([sector, capital_risk_inr]) => ({
      sector,
      capital_risk_inr: roundDecimal(capital_risk_inr, 2),
    })),
  };
}

async function getSignalFlagSummaryByDateRange(from_date, to_date) {
  const [rows] = await pool.query(
    `SELECT
       COUNT(*) AS total_signals,
       SUM(CASE WHEN target_reachability_warning = 1 THEN 1 ELSE 0 END) AS target_reachability_warnings
     FROM signals
     WHERE date BETWEEN ? AND ?`,
    [from_date, to_date]
  );
  const row = rows[0] || {};
  const total = parseInt(row.total_signals, 10) || 0;
  const warnings = parseInt(row.target_reachability_warnings, 10) || 0;
  return {
    total_signals: total,
    target_reachability_warnings: warnings,
    target_reachability_warning_rate_pct: total > 0 ? roundDecimal((warnings / total) * 100, 2) : 0,
  };
}

module.exports = {
  getCalibrationQualityByDateRange,
  getRegimeProbabilityByDateRange,
  getPortfolioRiskSnapshot,
  getSignalFlagSummaryByDateRange,
};
