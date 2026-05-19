const { pool } = require('../config/db');

function computeExpectedValue(confidence, risk_reward) {
  const conf = confidence != null ? parseFloat(confidence) : null;
  const rr = risk_reward != null ? parseFloat(risk_reward) : null;
  if (conf == null || rr == null || Number.isNaN(conf) || Number.isNaN(rr)) return null;
  const win_probability = conf / 100;
  return (win_probability * rr) - (1 - win_probability);
}

async function create(event) {
  const expected_value = event.blocked_expected_value != null
    ? event.blocked_expected_value
    : computeExpectedValue(event.blocked_confidence, event.blocked_rr);

  const sql = `
    INSERT INTO blocked_signal_events (
      symbol, date, strategy_source, direction, blocked_reason,
      blocked_confidence, blocked_rr, blocked_expected_value,
      active_trade_id, active_trade_symbol, active_trade_lifecycle_state
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    event.symbol,
    event.date,
    event.strategy_source || null,
    event.direction || null,
    event.blocked_reason,
    event.blocked_confidence != null ? event.blocked_confidence : null,
    event.blocked_rr != null ? event.blocked_rr : null,
    expected_value,
    event.active_trade_id || null,
    event.active_trade_symbol || null,
    event.active_trade_lifecycle_state || null,
  ];
  const [result] = await pool.query(sql, params);
  return { id: result.insertId, ...event, blocked_expected_value: expected_value };
}

async function getSummaryByDateRange(from_date, to_date) {
  const [summary_rows] = await pool.query(
    `SELECT
       COUNT(*) AS total_blocked,
       SUM(COALESCE(blocked_expected_value, 0)) AS opportunity_cost_score,
       SUM(CASE WHEN blocked_reason = 'STALE_CAPITAL' THEN 1 ELSE 0 END) AS blocked_by_stale,
       AVG(blocked_confidence) AS avg_blocked_confidence,
       AVG(blocked_rr) AS avg_blocked_rr
     FROM blocked_signal_events
     WHERE date BETWEEN ? AND ?`,
    [from_date, to_date]
  );

  const [by_reason] = await pool.query(
    `SELECT blocked_reason, COUNT(*) AS count, SUM(COALESCE(blocked_expected_value, 0)) AS expected_value
     FROM blocked_signal_events
     WHERE date BETWEEN ? AND ?
     GROUP BY blocked_reason
     ORDER BY count DESC`,
    [from_date, to_date]
  );

  const [by_symbol] = await pool.query(
    `SELECT symbol, COUNT(*) AS count, SUM(COALESCE(blocked_expected_value, 0)) AS expected_value
     FROM blocked_signal_events
     WHERE date BETWEEN ? AND ?
     GROUP BY symbol
     ORDER BY count DESC
     LIMIT 20`,
    [from_date, to_date]
  );

  return { summary: summary_rows[0] || {}, by_reason, by_symbol };
}

module.exports = {
  create,
  getSummaryByDateRange,
  computeExpectedValue,
};
