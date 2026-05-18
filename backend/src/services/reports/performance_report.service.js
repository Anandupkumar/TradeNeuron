const { pool } = require('../../config/db');
const pipelineRunModel = require('../../models/pipeline_run.model');
const paperTradeModel = require('../../models/paper_trade.model');
const rejectedSignalModel = require('../../models/rejected_signal.model');
const backtestResultModel = require('../../models/backtest_result.model');
const strategyPerformanceSnapshotModel = require('../../models/strategy_performance_snapshot.model');
const { ValidationError } = require('../../utils/errors');
const { formatDate, toIST } = require('../../utils/date.util');
const { roundDecimal } = require('../../utils/math.util');
const {
  getOutcomeAnalyticsByDateRange,
  getStrategyPerformanceSlicesByDateRange,
} = require('../analytics/performance_analytics.service');

const max_report_days = 365;
const date_pattern = /^\d{4}-\d{2}-\d{2}$/;

function addDays(date_str, days) {
  const [year, month, day] = date_str.split('-').map((part) => Number.parseInt(part, 10));
  const date_value = new Date(Date.UTC(year, month - 1, day));
  date_value.setUTCDate(date_value.getUTCDate() + days);
  return date_value.toISOString().slice(0, 10);
}

function toInteger(value) {
  return Number.parseInt(value, 10) || 0;
}

function toRoundedDecimal(value, decimals) {
  if (value == null) return null;
  return roundDecimal(Number.parseFloat(value), decimals);
}

function getDefaultDateRange() {
  const today_ist = formatDate(toIST(new Date()));
  return {
    from_date: addDays(today_ist, -29),
    to_date: today_ist,
  };
}

function getGeneratedAtIst() {
  const date_value = toIST(new Date());
  const year = date_value.getFullYear();
  const month = String(date_value.getMonth() + 1).padStart(2, '0');
  const day = String(date_value.getDate()).padStart(2, '0');
  const hours = String(date_value.getHours()).padStart(2, '0');
  const minutes = String(date_value.getMinutes()).padStart(2, '0');
  const seconds = String(date_value.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}+05:30`;
}

function getDateDiffDays(from_date, to_date) {
  const [from_year, from_month, from_day] = from_date.split('-').map((part) => Number.parseInt(part, 10));
  const [to_year, to_month, to_day] = to_date.split('-').map((part) => Number.parseInt(part, 10));
  const from_time = Date.UTC(from_year, from_month - 1, from_day);
  const to_time = Date.UTC(to_year, to_month - 1, to_day);
  return Math.floor((to_time - from_time) / (24 * 60 * 60 * 1000)) + 1;
}

function validateDateRange(input = {}) {
  const defaults = getDefaultDateRange();
  const from_date = input.from_date || defaults.from_date;
  const to_date = input.to_date || defaults.to_date;

  if (!date_pattern.test(from_date) || !date_pattern.test(to_date)) {
    throw new ValidationError('from_date and to_date must use YYYY-MM-DD format');
  }
  if (from_date > to_date) {
    throw new ValidationError('from_date must be on or before to_date');
  }

  const days = getDateDiffDays(from_date, to_date);
  if (days < 1 || days > max_report_days) {
    throw new ValidationError(`date range must be between 1 and ${max_report_days} days`);
  }

  return { from_date, to_date, days };
}

async function getSignalOverview(from_date, to_date) {
  const [summary_rows] = await pool.query(
    `SELECT
       COUNT(*) AS total_signals,
       SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) AS active_signals,
       SUM(CASE WHEN status = 'TARGET_HIT' THEN 1 ELSE 0 END) AS target_hits,
       SUM(CASE WHEN status = 'SL_HIT' THEN 1 ELSE 0 END) AS sl_hits,
       SUM(CASE WHEN status = 'EXPIRED' THEN 1 ELSE 0 END) AS expired_signals,
       AVG(confidence) AS avg_confidence,
       AVG(risk_reward) AS avg_risk_reward
     FROM signals
     WHERE date BETWEEN ? AND ?`,
    [from_date, to_date]
  );

  const [by_strategy] = await pool.query(
    `SELECT strategy_source, COUNT(*) AS count, AVG(confidence) AS avg_confidence
     FROM signals
     WHERE date BETWEEN ? AND ?
     GROUP BY strategy_source
     ORDER BY count DESC`,
    [from_date, to_date]
  );

  const [by_direction] = await pool.query(
    `SELECT direction, COUNT(*) AS count
     FROM signals
     WHERE date BETWEEN ? AND ?
     GROUP BY direction
     ORDER BY count DESC`,
    [from_date, to_date]
  );

  const [by_regime] = await pool.query(
    `SELECT market_regime, COUNT(*) AS count
     FROM signals
     WHERE date BETWEEN ? AND ?
     GROUP BY market_regime
     ORDER BY count DESC`,
    [from_date, to_date]
  );

  const row = summary_rows[0] || {};
  const total_signals = toInteger(row.total_signals);
  const target_hits = toInteger(row.target_hits);
  const sl_hits = toInteger(row.sl_hits);
  const expired_signals = toInteger(row.expired_signals);
  const resolved_signals = target_hits + sl_hits + expired_signals;

  return {
    total_signals,
    active_signals: toInteger(row.active_signals),
    target_hits,
    sl_hits,
    expired_signals,
    resolved_signals,
    target_hit_rate_pct: resolved_signals > 0 ? roundDecimal((target_hits / resolved_signals) * 100, 2) : 0,
    avg_confidence: toRoundedDecimal(row.avg_confidence, 2),
    avg_risk_reward: toRoundedDecimal(row.avg_risk_reward, 2),
    by_strategy,
    by_direction,
    by_regime,
  };
}

async function getFunnelSummary(from_date, to_date) {
  const rejection_distribution = await rejectedSignalModel.getDistributionByDateRange(from_date, to_date);
  const [signal_rows] = await pool.query(
    `SELECT COUNT(*) AS final_signals FROM signals WHERE date BETWEEN ? AND ?`,
    [from_date, to_date]
  );

  const final_signals = toInteger(signal_rows[0].final_signals);
  const total_candidates = final_signals + rejection_distribution.total_rejected;

  return {
    total_candidates,
    final_signals,
    overall_conversion_pct: total_candidates > 0
      ? roundDecimal((final_signals / total_candidates) * 100, 2)
      : 0,
    ...rejection_distribution,
  };
}

function normalizeBacktestSummary(summary) {
  return {
    total_runs: toInteger(summary.total_runs),
    avg_win_rate_pct: toRoundedDecimal(summary.avg_win_rate_pct, 2),
    avg_return_pct: toRoundedDecimal(summary.avg_return_pct, 4),
    avg_expectancy_pct: toRoundedDecimal(summary.avg_expectancy_pct, 4),
    avg_max_drawdown_pct: toRoundedDecimal(summary.avg_max_drawdown_pct, 4),
    avg_sharpe_ratio: toRoundedDecimal(summary.avg_sharpe_ratio, 4),
    avg_profit_factor: toRoundedDecimal(summary.avg_profit_factor, 4),
    total_signals: toInteger(summary.total_signals),
    by_strategy: summary.by_strategy || [],
  };
}

async function getPerformanceReport(input = {}) {
  const range = validateDateRange(input);
  const { from_date, to_date, days } = range;

  const [
    pipeline,
    signals,
    signal_funnel,
    signal_outcomes,
    paper_trading,
    strategy_current,
    strategy_snapshots,
    backtest_summary,
    backtest_results,
  ] = await Promise.all([
    pipelineRunModel.getSummaryByDateRange(from_date, to_date),
    getSignalOverview(from_date, to_date),
    getFunnelSummary(from_date, to_date),
    getOutcomeAnalyticsByDateRange(from_date, to_date),
    paperTradeModel.getSummaryByDateRange(from_date, to_date),
    getStrategyPerformanceSlicesByDateRange(from_date, to_date),
    strategyPerformanceSnapshotModel.findByDateRange(from_date, to_date),
    backtestResultModel.getSummaryByDateRange(from_date, to_date),
    backtestResultModel.findAll({
      page: 1,
      limit: 20,
      sort_by: 'run_date',
      sort_order: 'DESC',
      from_date,
      to_date,
    }),
  ]);

  const overview = {
    total_signals: signals.total_signals,
    closed_paper_trades: paper_trading.closed_trades,
    paper_win_rate_pct: paper_trading.win_rate_pct,
    paper_total_pnl_pct: toRoundedDecimal(paper_trading.total_pnl_pct, 4) || 0,
    pipeline_success_rate_pct: pipeline.success_rate_pct,
    signal_conversion_pct: signal_funnel.overall_conversion_pct,
    backtest_runs: toInteger(backtest_summary.total_runs),
  };

  return {
    range: { from_date, to_date, days },
    generated_at_ist: getGeneratedAtIst(),
    overview,
    pipeline,
    signals,
    signal_funnel,
    signal_outcomes,
    paper_trading,
    strategy_performance: {
      current: strategy_current,
      snapshots: strategy_snapshots,
    },
    backtest_summary: {
      ...normalizeBacktestSummary(backtest_summary),
      recent_results: backtest_results.rows,
    },
  };
}

function escapeCsvValue(value) {
  if (value == null) return '';
  const text = String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function csvLine(values) {
  return values.map((value) => escapeCsvValue(value)).join(',');
}

function buildPerformanceReportCsv(report) {
  const lines = [
    csvLine(['section', 'metric', 'value']),
    csvLine(['range', 'from_date', report.range.from_date]),
    csvLine(['range', 'to_date', report.range.to_date]),
    csvLine(['range', 'days', report.range.days]),
    csvLine(['overview', 'total_signals', report.overview.total_signals]),
    csvLine(['overview', 'closed_paper_trades', report.overview.closed_paper_trades]),
    csvLine(['overview', 'paper_win_rate_pct', report.overview.paper_win_rate_pct]),
    csvLine(['overview', 'paper_total_pnl_pct', report.overview.paper_total_pnl_pct]),
    csvLine(['overview', 'pipeline_success_rate_pct', report.overview.pipeline_success_rate_pct]),
    csvLine(['overview', 'signal_conversion_pct', report.overview.signal_conversion_pct]),
    csvLine(['pipeline', 'total_runs', report.pipeline.total_runs]),
    csvLine(['pipeline', 'completed_runs', report.pipeline.completed_runs]),
    csvLine(['pipeline', 'failed_runs', report.pipeline.failed_runs]),
    csvLine(['signals', 'total_signals', report.signals.total_signals]),
    csvLine(['signals', 'active_signals', report.signals.active_signals]),
    csvLine(['signals', 'target_hits', report.signals.target_hits]),
    csvLine(['signals', 'sl_hits', report.signals.sl_hits]),
    csvLine(['signals', 'expired_signals', report.signals.expired_signals]),
    csvLine(['signals', 'resolved_signals', report.signals.resolved_signals]),
    csvLine(['signals', 'target_hit_rate_pct', report.signals.target_hit_rate_pct]),
    csvLine(['paper_trading', 'avg_pnl_pct', report.paper_trading.avg_pnl_pct]),
    csvLine(['paper_trading', 'max_drawdown_pct', report.paper_trading.max_drawdown_pct]),
    csvLine(['backtest', 'total_runs', report.backtest_summary.total_runs]),
    csvLine(['backtest', 'avg_win_rate_pct', report.backtest_summary.avg_win_rate_pct]),
    '',
    csvLine(['strategy_name', 'scope_type', 'scope_value', 'trade_count', 'win_rate_pct', 'expectancy_pct', 'recommendation']),
  ];

  for (const row of report.strategy_performance.current) {
    lines.push(csvLine([
      row.strategy_name,
      row.scope_type,
      row.scope_value,
      row.trade_count,
      row.win_rate_pct,
      row.expectancy_pct,
      row.recommendation,
    ]));
  }

  return `${lines.join('\n')}\n`;
}

module.exports = {
  validateDateRange,
  getPerformanceReport,
  buildPerformanceReportCsv,
};
