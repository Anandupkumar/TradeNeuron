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

async function getDistribution(period_days) {
  const [total_rows] = await pool.query(
    `SELECT COUNT(*) AS total_rejected FROM rejected_signals WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
    [period_days]
  );

  const [by_stage] = await pool.query(
    `SELECT reject_stage, COUNT(*) AS count
     FROM rejected_signals
     WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY reject_stage
     ORDER BY count DESC`,
    [period_days]
  );

  const [by_symbol] = await pool.query(
    `SELECT symbol, COUNT(*) AS count
     FROM rejected_signals
     WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     GROUP BY symbol
     ORDER BY count DESC
     LIMIT 20`,
    [period_days]
  );

  const [avg_rows] = await pool.query(
    `SELECT
       AVG(raw_confidence) AS avg_raw_confidence,
       AVG(raw_rr)         AS avg_raw_rr
     FROM rejected_signals
     WHERE date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       AND raw_confidence IS NOT NULL`,
    [period_days]
  );

  const total_rejected = total_rows[0].total_rejected;
  const by_stage_pct = by_stage.map((r) => ({
    reject_stage: r.reject_stage,
    count: r.count,
    pct: total_rejected > 0 ? parseFloat(((r.count / total_rejected) * 100).toFixed(1)) : 0,
  }));

  return {
    total_rejected,
    by_stage: by_stage_pct,
    by_symbol,
    avg_raw_confidence_at_rejection: avg_rows[0].avg_raw_confidence != null
      ? parseFloat(parseFloat(avg_rows[0].avg_raw_confidence).toFixed(1))
      : null,
    avg_raw_rr_at_rejection: avg_rows[0].avg_raw_rr != null
      ? parseFloat(parseFloat(avg_rows[0].avg_raw_rr).toFixed(2))
      : null,
  };
}

async function getVwapQualityAudit(period_days) {
  const [rows] = await pool.query(
    `SELECT
       COUNT(*) AS total_vwap_rejected,
       AVG(raw_confidence) AS avg_confidence,
       AVG(raw_rr) AS avg_rr
     FROM rejected_signals
     WHERE reject_stage = 'VWAP_FILTER'
       AND date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)`,
    [period_days]
  );
  const row = rows[0];
  return {
    total_vwap_rejected: row.total_vwap_rejected,
    avg_confidence: row.avg_confidence != null ? parseFloat(parseFloat(row.avg_confidence).toFixed(1)) : null,
    avg_rr: row.avg_rr != null ? parseFloat(parseFloat(row.avg_rr).toFixed(2)) : null,
  };
}

module.exports = { insertRejected, findByDate, getDistribution, getVwapQualityAudit };
