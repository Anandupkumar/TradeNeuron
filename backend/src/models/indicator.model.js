const { pool } = require('../config/db');

async function upsert(indicator) {
  const sql = `
    INSERT INTO indicators (symbol, date, ema_20, ema_50, ema_200, rsi, macd_line, macd_signal, macd_histogram, atr, volume_sma_20, volume_change)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      ema_20 = VALUES(ema_20),
      ema_50 = VALUES(ema_50),
      ema_200 = VALUES(ema_200),
      rsi = VALUES(rsi),
      macd_line = VALUES(macd_line),
      macd_signal = VALUES(macd_signal),
      macd_histogram = VALUES(macd_histogram),
      atr = VALUES(atr),
      volume_sma_20 = VALUES(volume_sma_20),
      volume_change = VALUES(volume_change)
  `;
  const params = [
    indicator.symbol, indicator.date,
    indicator.ema_20, indicator.ema_50, indicator.ema_200,
    indicator.rsi,
    indicator.macd_line, indicator.macd_signal, indicator.macd_histogram,
    indicator.atr, indicator.volume_sma_20, indicator.volume_change,
  ];
  const [result] = await pool.query(sql, params);
  return result;
}

async function bulkUpsert(indicators) {
  if (indicators.length === 0) return;
  const sql = `
    INSERT INTO indicators (symbol, date, ema_20, ema_50, ema_200, rsi, macd_line, macd_signal, macd_histogram, atr, volume_sma_20, volume_change)
    VALUES ?
    ON DUPLICATE KEY UPDATE
      ema_20 = VALUES(ema_20),
      ema_50 = VALUES(ema_50),
      ema_200 = VALUES(ema_200),
      rsi = VALUES(rsi),
      macd_line = VALUES(macd_line),
      macd_signal = VALUES(macd_signal),
      macd_histogram = VALUES(macd_histogram),
      atr = VALUES(atr),
      volume_sma_20 = VALUES(volume_sma_20),
      volume_change = VALUES(volume_change)
  `;
  const values = indicators.map((i) => [
    i.symbol, i.date,
    i.ema_20, i.ema_50, i.ema_200,
    i.rsi,
    i.macd_line, i.macd_signal, i.macd_histogram,
    i.atr, i.volume_sma_20, i.volume_change,
  ]);
  const [result] = await pool.query(sql, [values]);
  return result;
}

async function findBySymbolAndDate(symbol, date) {
  const sql = `SELECT * FROM indicators WHERE symbol = ? AND date = ?`;
  const [rows] = await pool.query(sql, [symbol, date]);
  return rows[0] || null;
}

async function findBySymbolAndDateRange(symbol, start_date, end_date) {
  const sql = `
    SELECT * FROM indicators
    WHERE symbol = ? AND date BETWEEN ? AND ?
    ORDER BY date ASC
  `;
  const [rows] = await pool.query(sql, [symbol, start_date, end_date]);
  return rows;
}

async function findLatestBySymbol(symbol) {
  const sql = `SELECT * FROM indicators WHERE symbol = ? ORDER BY date DESC LIMIT 1`;
  const [rows] = await pool.query(sql, [symbol]);
  return rows[0] || null;
}

async function findBySymbolLast(symbol, limit) {
  const sql = `SELECT * FROM indicators WHERE symbol = ? ORDER BY date DESC LIMIT ?`;
  const [rows] = await pool.query(sql, [symbol, limit]);
  return rows.reverse();
}

module.exports = {
  upsert,
  bulkUpsert,
  findBySymbolAndDate,
  findBySymbolAndDateRange,
  findLatestBySymbol,
  findBySymbolLast,
};
