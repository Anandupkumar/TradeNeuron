const { pool } = require('../config/db');

async function upsert(candle) {
  const sql = `
    INSERT INTO candles (symbol, date, open, high, low, close, adjusted_close, volume, source, delivery_pct)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      open = VALUES(open),
      high = VALUES(high),
      low = VALUES(low),
      close = VALUES(close),
      adjusted_close = VALUES(adjusted_close),
      volume = VALUES(volume),
      source = VALUES(source),
      delivery_pct = COALESCE(VALUES(delivery_pct), delivery_pct)
  `;
  const params = [
    candle.symbol, candle.date, candle.open, candle.high,
    candle.low, candle.close, candle.adjusted_close, candle.volume,
    candle.source || 'YAHOO',
    candle.delivery_pct != null ? candle.delivery_pct : null,
  ];
  const [result] = await pool.query(sql, params);
  return result;
}

async function bulkUpsert(candles) {
  if (candles.length === 0) return;
  const sql = `
    INSERT INTO candles (symbol, date, open, high, low, close, adjusted_close, volume, source, delivery_pct)
    VALUES ?
    ON DUPLICATE KEY UPDATE
      open = VALUES(open),
      high = VALUES(high),
      low = VALUES(low),
      close = VALUES(close),
      adjusted_close = VALUES(adjusted_close),
      volume = VALUES(volume),
      source = VALUES(source),
      delivery_pct = COALESCE(VALUES(delivery_pct), delivery_pct)
  `;
  const values = candles.map((c) => [
    c.symbol, c.date, c.open, c.high,
    c.low, c.close, c.adjusted_close, c.volume,
    c.source || 'YAHOO',
    c.delivery_pct != null ? c.delivery_pct : null,
  ]);
  const [result] = await pool.query(sql, [values]);
  return result;
}

async function findBySymbolAndDate(symbol, date) {
  const sql = `SELECT * FROM candles WHERE symbol = ? AND date = ? LIMIT 1`;
  const [rows] = await pool.query(sql, [symbol, date]);
  return rows[0] || null;
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

async function findNextCandle(symbol, date) {
  const sql = `SELECT * FROM candles WHERE symbol = ? AND date > ? ORDER BY date ASC LIMIT 1`;
  const [rows] = await pool.query(sql, [symbol, date]);
  return rows[0] || null;
}

// Phase C / Fix 6: fetch the N candles ending strictly BEFORE a given date,
// returned in ascending order. Used to seed the Bollinger-bandwidth percentile
// baseline before the signal fires so the vol-compression exit has context.
async function findTrailingBefore(symbol, before_date, n) {
  const sql = `
    SELECT * FROM candles
     WHERE symbol = ? AND date < ?
     ORDER BY date DESC
     LIMIT ?
  `;
  const [rows] = await pool.query(sql, [symbol, before_date, parseInt(n, 10)]);
  return rows.reverse();
}

module.exports = {
  upsert,
  bulkUpsert,
  findBySymbolAndDate,
  findBySymbolAndDateRange,
  findLatestBySymbol,
  findBySymbolLast,
  find52WeekHigh,
  findDatesForSymbol,
  findNextCandle,
  findTrailingBefore,
};
