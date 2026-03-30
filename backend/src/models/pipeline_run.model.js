const { pool } = require('../config/db');

async function create(run_date) {
  const sql = `INSERT INTO pipeline_runs (run_date, status) VALUES (?, 'running')`;
  const [result] = await pool.query(sql, [run_date]);
  return result.insertId;
}

async function markCompleted(id, { duration_ms, signals_generated, regime }) {
  const sql = `
    UPDATE pipeline_runs
    SET status = 'completed', completed_at = NOW(), duration_ms = ?, signals_generated = ?, regime = ?
    WHERE id = ?
  `;
  await pool.query(sql, [duration_ms, signals_generated, regime || null, id]);
}

async function markFailed(id, duration_ms) {
  const sql = `
    UPDATE pipeline_runs
    SET status = 'failed', completed_at = NOW(), duration_ms = ?
    WHERE id = ?
  `;
  await pool.query(sql, [duration_ms, id]);
}

async function findLastCompleted() {
  const sql = `
    SELECT completed_at FROM pipeline_runs
    WHERE status = 'completed'
    ORDER BY completed_at DESC
    LIMIT 1
  `;
  const [rows] = await pool.query(sql);
  return rows[0]?.completed_at || null;
}

module.exports = { create, markCompleted, markFailed, findLastCompleted };
