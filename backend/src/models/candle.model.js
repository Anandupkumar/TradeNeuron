const { pool } = require('../config/db');

async function upsert(candle) {
  const sql = `
    INSERT INTO candles (symbol, date, open, high, low, close, adjusted_close, volume, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      open = VALUES(open),
      high = VALUES(high),
      low = VALUES(low),
      close = VALUES(close),
      adjusted_close = VALUES(adjusted_close),
      volume = VALUES(volume),
      source = VALUES(source)
  `;
  const params = [
    candle.symbol, candle.date, candle.open, candle.high,
    candle.low, candle.close, candle.adjusted_close, candle.volume,
    candle.source || 'YAHOO',
  ];
  const [result] = await pool.query(sql, params);
  return result;
}

async function bulkUpsert(candles) {
  if (candles.length === 0) return;
  const sql = `
    INSERT INTO candles (symbol, date, open, high, low, close, adjusted_close, volume, source)
    VALUES ?
    ON DUPLICATE KEY UPDATE
      open = VALUES(open),
      high = VALUES(high),
      low = VALUES(low),
      close = VALUES(close),
      adjusted_close = VALUES(adjusted_close),
      volume = VALUES(volume),
      source = VALUES(source)
  `;
  const values = candles.map((c) => [
    c.symbol, c.date, c.open, c.high,
    c.low, c.close, c.adjusted_close, c.volume,
    c.source || 'YAHOO',
  ]);
  const [result] = await pool.query(sql, [values]);
  return result;
}

async function findBySymbolAndDateRange(symbol, start_date, end_date) {
  const sql = `
    SELECT * FROM candles
    WHERE symbol = ? AND date BETWEEN ? AND ?
    ORDER BY date ASC
  `;
  const [rows] = await pool.query(sql, [symbol, start_date, end_date]);
  return rows;
}

async function findLatestBySymbol(symbol) {
  const sql = `SELECT * FROM candles WHERE symbol = ? ORDER BY date DESC LIMIT 1`;
  const [rows] = await pool.query(sql, [symbol]);
  return rows[0] || null;
}

async function findBySymbolLast(symbol, limit) {
  const sql = `SELECT * FROM candles WHERE symbol = ? ORDER BY date DESC LIMIT ?`;
  const [rows] = await pool.query(sql, [symbol, limit]);
  return rows.reverse();
}

async function find52WeekHigh(symbol) {
  const sql = `
    SELECT MAX(high) as high_52w
    FROM candles
    WHERE symbol = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 52 WEEK)
  `;
  const [rows] = await pool.query(sql, [symbol]);
  return rows[0]?.high_52w || null;
}

async function findDatesForSymbol(symbol) {
  const sql = `SELECT date FROM candles WHERE symbol = ? ORDER BY date ASC`;
  const [rows] = await pool.query(sql, [symbol]);
  return rows.map((r) => r.date);
}

module.exports = {
  upsert,
  bulkUpsert,
  findBySymbolAndDateRange,
  findLatestBySymbol,
  findBySymbolLast,
  find52WeekHigh,
  findDatesForSymbol,
};
