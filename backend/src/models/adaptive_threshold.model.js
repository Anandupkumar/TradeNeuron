const { pool } = require('../config/db');

async function upsert(threshold) {
  const sql = `
    INSERT INTO adaptive_thresholds (symbol, date, vix_threshold, volume_spike_threshold, rsi_oversold, rsi_pullback, rsi_overbought)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      vix_threshold = VALUES(vix_threshold),
      volume_spike_threshold = VALUES(volume_spike_threshold),
      rsi_oversold = VALUES(rsi_oversold),
      rsi_pullback = VALUES(rsi_pullback),
      rsi_overbought = VALUES(rsi_overbought)
  `;
  const params = [
    threshold.symbol, threshold.date,
    threshold.vix_threshold, threshold.volume_spike_threshold,
    threshold.rsi_oversold, threshold.rsi_pullback, threshold.rsi_overbought,
  ];
  const [result] = await pool.query(sql, params);
  return result;
}

async function findBySymbolAndDate(symbol, date) {
  const sql = `SELECT * FROM adaptive_thresholds WHERE symbol = ? AND date = ?`;
  const [rows] = await pool.query(sql, [symbol, date]);
  return rows[0] || null;
}

async function findLatestBySymbol(symbol) {
  const sql = `SELECT * FROM adaptive_thresholds WHERE symbol = ? ORDER BY date DESC LIMIT 1`;
  const [rows] = await pool.query(sql, [symbol]);
  return rows[0] || null;
}

module.exports = { upsert, findBySymbolAndDate, findLatestBySymbol };
