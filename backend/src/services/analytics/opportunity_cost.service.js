const blockedSignalEventModel = require('../../models/blocked_signal_event.model');
const { roundDecimal } = require('../../utils/math.util');

function toInt(value) {
  return parseInt(value, 10) || 0;
}

function toFloat(value, decimals = 4) {
  if (value == null) return null;
  return roundDecimal(parseFloat(value), decimals);
}

async function getOpportunityCostSummaryByDateRange(from_date, to_date) {
  const { summary, by_reason, by_symbol } = await blockedSignalEventModel.getSummaryByDateRange(from_date, to_date);
  const total_blocked = toInt(summary.total_blocked);
  const blocked_by_stale = toInt(summary.blocked_by_stale);

  return {
    total_blocked,
    opportunity_cost_score: toFloat(summary.opportunity_cost_score, 4) || 0,
    stale_capital_suppression_rate_pct: total_blocked > 0
      ? roundDecimal((blocked_by_stale / total_blocked) * 100, 2)
      : 0,
    blocked_by_stale,
    avg_blocked_confidence: toFloat(summary.avg_blocked_confidence, 2),
    avg_blocked_rr: toFloat(summary.avg_blocked_rr, 2),
    by_reason: by_reason.map((row) => ({
      blocked_reason: row.blocked_reason,
      count: toInt(row.count),
      expected_value: toFloat(row.expected_value, 4) || 0,
    })),
    by_symbol: by_symbol.map((row) => ({
      symbol: row.symbol,
      count: toInt(row.count),
      expected_value: toFloat(row.expected_value, 4) || 0,
    })),
  };
}

module.exports = { getOpportunityCostSummaryByDateRange };
