const { pool } = require('../config/db');

async function create(signal) {
  const sql = `
    INSERT INTO signals (symbol, date, signal_type, confidence, entry_price, stop_loss, target_price, risk_reward, reasons, status, strategy_source, direction, shares_to_buy, position_value, capital_risk_inr)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    signal.symbol, signal.date, signal.signal_type || 'BUY',
    signal.confidence, signal.entry_price, signal.stop_loss,
    signal.target_price, signal.risk_reward,
    JSON.stringify(signal.reasons), signal.status || 'ACTIVE',
    signal.strategy_source,
    signal.direction || 'LONG',
    signal.shares_to_buy || null,
    signal.position_value || null,
    signal.capital_risk_inr || null,
  ];
  const [result] = await pool.query(sql, params);
  return { id: result.insertId, ...signal };
}

async function findActive() {
  const sql = `SELECT * FROM signals WHERE status = 'ACTIVE' ORDER BY date DESC`;
  const [rows] = await pool.query(sql);
  return rows;
}

async function findActiveBySymbol(symbol) {
  const sql = `SELECT * FROM signals WHERE symbol = ? AND status = 'ACTIVE' ORDER BY date DESC`;
  const [rows] = await pool.query(sql, [symbol]);
  return rows;
}

async function findById(id) {
  const sql = `SELECT * FROM signals WHERE id = ?`;
  const [rows] = await pool.query(sql, [id]);
  return rows[0] || null;
}

async function updateStatus(id, status, closed_at) {
  const sql = `UPDATE signals SET status = ?, closed_at = ? WHERE id = ?`;
  const [result] = await pool.query(sql, [status, closed_at, id]);
  return result;
}

async function findAll({ page = 1, limit = 20, sort_by = 'date', sort_order = 'DESC', status, symbol, strategy_source } = {}) {
  let where_clauses = [];
  let params = [];

  if (status) {
    where_clauses.push('status = ?');
    params.push(status);
  }
  if (symbol) {
    where_clauses.push('symbol = ?');
    params.push(symbol);
  }
  if (strategy_source) {
    where_clauses.push('strategy_source = ?');
    params.push(strategy_source);
  }

  const where = where_clauses.length > 0 ? `WHERE ${where_clauses.join(' AND ')}` : '';
  const allowed_sort = ['date', 'confidence', 'risk_reward', 'created_at'];
  const safe_sort = allowed_sort.includes(sort_by) ? sort_by : 'date';
  const safe_order = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const count_sql = `SELECT COUNT(*) as total FROM signals ${where}`;
  const [count_rows] = await pool.query(count_sql, params);
  const total = count_rows[0].total;

  const data_sql = `SELECT * FROM signals ${where} ORDER BY ${safe_sort} ${safe_order} LIMIT ? OFFSET ?`;
  const [rows] = await pool.query(data_sql, [...params, limit, offset]);

  return { rows, total, page, limit };
}

async function countActiveBySymbol(symbol) {
  const sql = `SELECT COUNT(*) as count FROM signals WHERE symbol = ? AND status = 'ACTIVE'`;
  const [rows] = await pool.query(sql, [symbol]);
  return rows[0].count;
}

async function countActiveBySector(sector_symbols, direction = null) {
  if (sector_symbols.length === 0) return 0;
  const placeholders = sector_symbols.map(() => '?').join(',');
  let sql = `SELECT COUNT(*) as count FROM signals WHERE symbol IN (${placeholders}) AND status = 'ACTIVE'`;
  const params = [...sector_symbols];
  if (direction) {
    sql += ` AND direction = ?`;
    params.push(direction);
  }
  const [rows] = await pool.query(sql, params);
  return rows[0].count;
}

async function countAllActive(direction = null) {
  let sql = `SELECT COUNT(*) as count FROM signals WHERE status = 'ACTIVE'`;
  const params = [];
  if (direction) {
    sql += ` AND direction = ?`;
    params.push(direction);
  }
  const [rows] = await pool.query(sql, params);
  return rows[0].count;
}

module.exports = {
  create,
  findActive,
  findActiveBySymbol,
  findById,
  updateStatus,
  findAll,
  countActiveBySymbol,
  countActiveBySector,
  countAllActive,
};
