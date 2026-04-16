const { pool } = require('../config/db');

async function upsertBucket(bucket, total_signals, actual_win_rate, computed_at) {
  const sql = `
    INSERT INTO confidence_calibration (confidence_bucket, total_signals, actual_win_rate, computed_at)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      total_signals = VALUES(total_signals),
      actual_win_rate = VALUES(actual_win_rate)
  `;
  await pool.query(sql, [bucket, total_signals, actual_win_rate, computed_at]);
}

async function getLatest() {
  const sql = `
    SELECT confidence_bucket, total_signals, actual_win_rate, computed_at
    FROM confidence_calibration
    WHERE computed_at = (SELECT MAX(computed_at) FROM confidence_calibration)
    ORDER BY confidence_bucket ASC
  `;
  const [rows] = await pool.query(sql);
  return rows;
}

async function findLatestForBucket(confidence_bucket) {
  const sql = `
    SELECT confidence_bucket, total_signals, actual_win_rate, computed_at
    FROM confidence_calibration
    WHERE confidence_bucket = ?
    ORDER BY computed_at DESC
    LIMIT 1
  `;
  const [rows] = await pool.query(sql, [confidence_bucket]);
  return rows[0] || null;
}

module.exports = { upsertBucket, getLatest, findLatestForBucket };
