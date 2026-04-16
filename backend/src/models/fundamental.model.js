const { pool } = require('../config/db');

async function upsert(fundamental) {
  const sql = `
    INSERT INTO fundamentals (symbol, fetched_date, debt_to_equity, eps_growth_yoy, revenue_growth, promoter_pledge, next_earnings_date, is_healthy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      debt_to_equity = VALUES(debt_to_equity),
      eps_growth_yoy = VALUES(eps_growth_yoy),
      revenue_growth = VALUES(revenue_growth),
      promoter_pledge = VALUES(promoter_pledge),
      next_earnings_date = VALUES(next_earnings_date),
      is_healthy = VALUES(is_healthy)
  `;
  const params = [
    fundamental.symbol, fundamental.fetched_date,
    fundamental.debt_to_equity, fundamental.eps_growth_yoy,
    fundamental.revenue_growth, fundamental.promoter_pledge,
    fundamental.next_earnings_date != null ? fundamental.next_earnings_date : null,
    fundamental.is_healthy ? 1 : 0,
  ];
  const [result] = await pool.query(sql, params);
  return result;
}

async function findLatestBySymbol(symbol) {
  const sql = `SELECT * FROM fundamentals WHERE symbol = ? ORDER BY fetched_date DESC LIMIT 1`;
  const [rows] = await pool.query(sql, [symbol]);
  return rows[0] || null;
}

async function isHealthy(symbol) {
  const latest = await findLatestBySymbol(symbol);
  if (!latest) return true; // fail-open
  return latest.is_healthy === 1;
}

module.exports = { upsert, findLatestBySymbol, isHealthy };
