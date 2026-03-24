const { pool } = require('../config/db');

async function getSymbolsForDateRange(start_date, end_date) {
  const sql = `
    SELECT DISTINCT symbol FROM nifty50_composition
    WHERE added_date <= ? AND (removed_date IS NULL OR removed_date >= ?)
  `;
  const [rows] = await pool.query(sql, [end_date, start_date]);
  return rows.map((r) => r.symbol);
}

async function getCurrentSymbols() {
  const sql = `SELECT DISTINCT symbol FROM nifty50_composition WHERE removed_date IS NULL`;
  const [rows] = await pool.query(sql);
  return rows.map((r) => r.symbol);
}

async function upsert(entry) {
  const sql = `
    INSERT INTO nifty50_composition (symbol, added_date, removed_date)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE removed_date = VALUES(removed_date)
  `;
  const [result] = await pool.query(sql, [entry.symbol, entry.added_date, entry.removed_date || null]);
  return result;
}

async function count() {
  const [rows] = await pool.query('SELECT COUNT(*) as cnt FROM nifty50_composition');
  return rows[0].cnt;
}

module.exports = { getSymbolsForDateRange, getCurrentSymbols, upsert, count };
