const { pool } = require('../../config/db');
const config = require('../../config/env');
const { getSector } = require('../../utils/symbols.util');
const { roundDecimal } = require('../../utils/math.util');
const {
  RANKING_SCORE_BANDS,
  STRATEGY_RECOMMENDATIONS,
} = require('../../config/constants');

function bucketRelativeStrength(value) {
  const rs = value != null ? parseFloat(value) : null;
  if (rs == null || Number.isNaN(rs)) return 'UNKNOWN';
  if (rs >= RANKING_SCORE_BANDS.VERY_STRONG_RS) return 'VERY_STRONG';
  if (rs >= RANKING_SCORE_BANDS.STRONG_RS) return 'STRONG';
  if (rs <= RANKING_SCORE_BANDS.VERY_WEAK_RS) return 'VERY_WEAK';
  if (rs <= RANKING_SCORE_BANDS.WEAK_RS) return 'WEAK';
  return 'NEUTRAL';
}

function bucketConfidence(value) {
  if (value == null) return null;
  const numeric = parseFloat(value);
  if (Number.isNaN(numeric)) return null;
  return Math.floor(numeric / 5) * 5;
}

function computeDrawdown(pnls) {
  if (pnls.length === 0) return 0;
  let cumulative = 0;
  let peak = 0;
  let max_drawdown = 0;
  for (const pnl of pnls) {
    cumulative += pnl;
    if (cumulative > peak) peak = cumulative;
    max_drawdown = Math.max(max_drawdown, peak - cumulative);
  }
  return roundDecimal(max_drawdown, 4);
}

function buildStats(rows) {
  const trade_count = rows.length;
  if (trade_count === 0) {
    return {
      trade_count: 0,
      win_rate_pct: 0,
      avg_pnl_pct: 0,
      profit_factor: null,
      expectancy_pct: 0,
      max_drawdown_pct: 0,
    };
  }

  const pnls = rows.map((row) => parseFloat(row.pnl_pct) || 0);
  const wins = rows.filter((row) => (parseFloat(row.pnl_pct) || 0) > 0).length;
  const avg_pnl_pct = pnls.reduce((sum, value) => sum + value, 0) / trade_count;
  const positive_sum = pnls.filter((value) => value > 0).reduce((sum, value) => sum + value, 0);
  const negative_sum = Math.abs(pnls.filter((value) => value < 0).reduce((sum, value) => sum + value, 0));

  return {
    trade_count,
    win_rate_pct: roundDecimal((wins / trade_count) * 100, 2),
    avg_pnl_pct: roundDecimal(avg_pnl_pct, 4),
    profit_factor: negative_sum > 0 ? roundDecimal(positive_sum / negative_sum, 4) : null,
    expectancy_pct: roundDecimal(avg_pnl_pct, 4),
    max_drawdown_pct: computeDrawdown(pnls),
  };
}

function recommendSlice(stats) {
  if (stats.trade_count < config.strategy_disable_min_trades) {
    return {
      recommendation: STRATEGY_RECOMMENDATIONS.WATCH,
      reason: `Only ${stats.trade_count} trades collected`,
    };
  }

  const low_win_rate = stats.win_rate_pct < (config.strategy_disable_win_rate * 100);
  const weak_profit_factor = stats.profit_factor != null && stats.profit_factor < (config.strategy_pruning_profit_factor_floor || 1.0);
  const negative_expectancy = stats.expectancy_pct < (config.strategy_pruning_expectancy_floor || 0);

  if (low_win_rate || weak_profit_factor || negative_expectancy) {
    const reasons = [];
    if (low_win_rate) reasons.push(`win rate ${stats.win_rate_pct}%`);
    if (weak_profit_factor) reasons.push(`profit factor ${stats.profit_factor}`);
    if (negative_expectancy) reasons.push(`expectancy ${stats.expectancy_pct}%`);
    return {
      recommendation: STRATEGY_RECOMMENDATIONS.DISABLE,
      reason: reasons.join(', '),
    };
  }

  return {
    recommendation: STRATEGY_RECOMMENDATIONS.KEEP,
    reason: `profit factor ${stats.profit_factor ?? 'n/a'}, expectancy ${stats.expectancy_pct}%`,
  };
}

async function getOutcomeAnalytics(days = 90) {
  const [rows] = await pool.query(
    `SELECT strategy, market_regime, sector, confidence_bucket, rs_bucket, outcome
     FROM signal_outcomes
     WHERE resolved_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
    [days]
  );

  const groupBy = (key) => {
    const map = new Map();
    for (const row of rows) {
      const bucket = row[key] == null ? 'UNKNOWN' : row[key];
      const current = map.get(bucket) || { key: bucket, total: 0, wins: 0 };
      current.total += 1;
      if (row.outcome === 'TARGET_HIT') current.wins += 1;
      map.set(bucket, current);
    }
    return Array.from(map.values()).map((item) => ({
      ...item,
      win_rate_pct: item.total > 0 ? roundDecimal((item.wins / item.total) * 100, 2) : 0,
    })).sort((a, b) => b.total - a.total);
  };

  return {
    by_strategy: groupBy('strategy'),
    by_regime: groupBy('market_regime'),
    by_sector: groupBy('sector'),
    by_confidence_bucket: groupBy('confidence_bucket'),
    by_rs_bucket: groupBy('rs_bucket'),
  };
}

async function getStrategyPerformanceSlices(days = 90) {
  const [rows] = await pool.query(
    `SELECT
       pt.pnl_pct,
       pt.exit_date,
       s.strategy_source,
       s.market_regime,
       s.symbol
     FROM paper_trades pt
     JOIN signals s ON s.id = pt.signal_id
     WHERE pt.status = 'CLOSED'
       AND pt.exit_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
    [days]
  );

  const scopes = {
    GLOBAL: new Map(),
    REGIME: new Map(),
    SECTOR: new Map(),
  };

  for (const row of rows) {
    const strategy = row.strategy_source || 'UNKNOWN';
    const regime = row.market_regime || 'UNKNOWN';
    const sector = getSector(row.symbol);

    const keys = [
      ['GLOBAL', `${strategy}::ALL`],
      ['REGIME', `${strategy}::${regime}`],
      ['SECTOR', `${strategy}::${sector}`],
    ];

    for (const [scope_type, composite] of keys) {
      const map = scopes[scope_type];
      const bucket = map.get(composite) || [];
      bucket.push(row);
      map.set(composite, bucket);
    }
  }

  const snapshots = [];
  for (const [scope_type, map] of Object.entries(scopes)) {
    for (const [composite, bucket] of map.entries()) {
      const [strategy_name, scope_value] = composite.split('::');
      const stats = buildStats(bucket);
      const verdict = recommendSlice(stats);
      snapshots.push({
        strategy_name,
        scope_type,
        scope_value,
        ...stats,
        recommendation: verdict.recommendation,
        recommendation_reason: verdict.reason,
      });
    }
  }

  snapshots.sort((a, b) => {
    if (a.strategy_name !== b.strategy_name) return a.strategy_name.localeCompare(b.strategy_name);
    if (a.scope_type !== b.scope_type) return a.scope_type.localeCompare(b.scope_type);
    return a.scope_value.localeCompare(b.scope_value);
  });

  return snapshots;
}

module.exports = {
  bucketRelativeStrength,
  bucketConfidence,
  getOutcomeAnalytics,
  getStrategyPerformanceSlices,
  buildStats,
  recommendSlice,
};
