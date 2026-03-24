const { pool } = require('../config/db');

async function insertRejected(entry) {
  const sql = `
    INSERT INTO rejected_signals (symbol, date, strategy_source, reject_stage, reject_reason, raw_confidence, raw_rr)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    entry.symbol,
    entry.date,
    entry.strategy_source || 'unknown',
    entry.reject_stage,
    entry.reject_reason,
    entry.raw_confidence != null ? entry.raw_confidence : null,
    entry.raw_rr != null ? entry.raw_rr : null,
  ];
  await pool.query(sql, params);
}

async function findByDate(date) {
  let sql = 'SELECT * FROM rejected_signals';
  const params = [];
  if (date) {
    sql += ' WHERE date = ?';
    params.push(date);
  }
  sql += ' ORDER BY created_at DESC LIMIT 200';
  const [rows] = await pool.query(sql, params);
  return rows;
}

module.exports = { insertRejected, findByDate };
