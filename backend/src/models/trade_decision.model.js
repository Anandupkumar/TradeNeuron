const { pool } = require('../config/db');

async function upsertDecision({ signal_id, user_identifier, decision, notes, actual_entry, actual_qty }) {
  const sql = `
    INSERT INTO trade_decisions (signal_id, user_identifier, decision, notes, actual_entry, actual_qty)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      decision = VALUES(decision),
      notes = VALUES(notes),
      actual_entry = VALUES(actual_entry),
      actual_qty = VALUES(actual_qty),
      updated_at = CURRENT_TIMESTAMP
  `;
  const params = [signal_id, user_identifier, decision, notes || null, actual_entry || null, actual_qty || null];
  const [result] = await pool.query(sql, params);
  return result;
}

async function getDecisionForSignal(signal_id, user_identifier) {
  const sql = `SELECT * FROM trade_decisions WHERE signal_id = ? AND user_identifier = ?`;
  const [rows] = await pool.query(sql, [signal_id, user_identifier]);
  return rows[0] || null;
}

async function getDecisionHistory(user_identifier, limit = 50) {
  const sql = `
    SELECT td.*, s.symbol, s.signal_type, s.direction, s.entry_price, s.stop_loss, s.target_price, s.confidence, s.status AS signal_status
    FROM trade_decisions td
    JOIN signals s ON td.signal_id = s.id
    WHERE td.user_identifier = ?
    ORDER BY td.decided_at DESC
    LIMIT ?
  `;
  const [rows] = await pool.query(sql, [user_identifier, limit]);
  return rows;
}

module.exports = { upsertDecision, getDecisionForSignal, getDecisionHistory };
