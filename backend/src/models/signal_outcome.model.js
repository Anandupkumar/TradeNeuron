const { pool } = require('../config/db');

async function create(outcome) {
  const sql = `
    INSERT INTO signal_outcomes (signal_id, outcome, strategy, features_json, resolved_at)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      outcome = VALUES(outcome),
      strategy = VALUES(strategy),
      features_json = VALUES(features_json),
      resolved_at = VALUES(resolved_at)
  `;
  const params = [
    outcome.signal_id,
    outcome.outcome,
    outcome.strategy || null,
    outcome.features_json ? JSON.stringify(outcome.features_json) : null,
    outcome.resolved_at,
  ];
  const [result] = await pool.query(sql, params);
  return result;
}

async function findRecent(days = 90) {
  const sql = `
    SELECT * FROM signal_outcomes
    WHERE resolved_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    ORDER BY resolved_at DESC
  `;
  const [rows] = await pool.query(sql, [days]);
  return rows;
}

module.exports = { create, findRecent };
