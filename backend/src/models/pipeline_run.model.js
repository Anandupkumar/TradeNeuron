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

async function getSummaryByDateRange(from_date, to_date) {
  const [summary_rows] = await pool.query(
    `SELECT
       COUNT(*) AS total_runs,
       SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed_runs,
       SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_runs,
       SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS running_runs,
       AVG(CASE WHEN duration_ms IS NOT NULL THEN duration_ms ELSE NULL END) AS avg_duration_ms,
       MAX(duration_ms) AS max_duration_ms,
       SUM(CASE WHEN status = 'completed' THEN signals_generated ELSE 0 END) AS signals_generated
     FROM pipeline_runs
     WHERE run_date BETWEEN ? AND ?`,
    [from_date, to_date]
  );

  const [run_rows] = await pool.query(
    `SELECT id, run_date, started_at, completed_at, status, duration_ms, signals_generated, regime
     FROM pipeline_runs
     WHERE run_date BETWEEN ? AND ?
     ORDER BY run_date DESC, id DESC
     LIMIT 30`,
    [from_date, to_date]
  );

  const row = summary_rows[0] || {};
  const total_runs = parseInt(row.total_runs, 10) || 0;
  const completed_runs = parseInt(row.completed_runs, 10) || 0;

  return {
    total_runs,
    completed_runs,
    failed_runs: parseInt(row.failed_runs, 10) || 0,
    running_runs: parseInt(row.running_runs, 10) || 0,
    success_rate_pct: total_runs > 0 ? Math.round((completed_runs / total_runs) * 10000) / 100 : 0,
    avg_duration_ms: row.avg_duration_ms != null ? Math.round(parseFloat(row.avg_duration_ms)) : null,
    max_duration_ms: row.max_duration_ms != null ? parseInt(row.max_duration_ms, 10) : null,
    signals_generated: parseInt(row.signals_generated, 10) || 0,
    recent_runs: run_rows,
  };
}

module.exports = {
  create,
  markCompleted,
  markFailed,
  findLastCompleted,
  getSummaryByDateRange,
};
