const { pool } = require('../config/db');

async function create(signal) {
  const sql = `
    INSERT INTO signals (
      symbol, date, signal_type, confidence, raw_confidence, confidence_calibrated,
      entry_degraded, confidence_tier, entry_price, stop_loss, target_price,
      risk_reward, reasons, status, strategy_source, direction, execution_type,
      is_executable, shares_to_buy, position_value, capital_risk_inr,
      regime_size_multiplier, explanation, confidence_breakdown, market_regime,
      ranking_score, ranking_components, exit_policy, max_hold_days
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    signal.symbol, signal.date, signal.signal_type || 'BUY',
    signal.confidence,
    signal.raw_confidence != null ? signal.raw_confidence : signal.confidence,
    signal.confidence_calibrated != null ? (signal.confidence_calibrated ? 1 : 0) : 0,
    signal.entry_degraded != null ? (signal.entry_degraded ? 1 : 0) : 0,
    signal.confidence_tier || null,
    signal.entry_price, signal.stop_loss,
    signal.target_price, signal.risk_reward,
    JSON.stringify(signal.reasons), signal.status || 'ACTIVE',
    signal.strategy_source,
    signal.direction || 'LONG',
    signal.execution_type || 'EQUITY',
    signal.is_executable != null ? signal.is_executable : 1,
    signal.shares_to_buy || null,
    signal.position_value || null,
    signal.capital_risk_inr || null,
    signal.regime_size_multiplier != null ? signal.regime_size_multiplier : 1.00,
    signal.explanation ? JSON.stringify(signal.explanation) : null,
    signal.confidence_breakdown ? JSON.stringify(signal.confidence_breakdown) : null,
    signal.market_regime || null,
    signal.ranking_score != null ? signal.ranking_score : null,
    signal.ranking_components ? JSON.stringify(signal.ranking_components) : null,
    signal.exit_policy ? JSON.stringify(signal.exit_policy) : null,
    signal.max_hold_days != null ? signal.max_hold_days : null,
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

async function findAll({ page = 1, limit = 20, sort_by = 'date', sort_order = 'DESC', status, symbol, strategy_source, direction, confidence_tier, min_confidence, from_date, to_date, favorites_only, user_id } = {}) {
  let where_clauses = [];
  let params = [];
  let use_join = false;

  if (status) {
    where_clauses.push('s.status = ?');
    params.push(status);
  }
  if (symbol) {
    where_clauses.push('s.symbol = ?');
    params.push(symbol);
  }
  if (strategy_source) {
    where_clauses.push('s.strategy_source = ?');
    params.push(strategy_source);
  }
  if (direction) {
    where_clauses.push('s.direction = ?');
    params.push(direction);
  }
  if (confidence_tier) {
    where_clauses.push('s.confidence_tier = ?');
    params.push(confidence_tier);
  }
  if (min_confidence != null && min_confidence > 0) {
    where_clauses.push('s.confidence >= ?');
    params.push(min_confidence);
  }
  if (from_date) {
    where_clauses.push('s.date >= ?');
    params.push(from_date);
  }
  if (to_date) {
    where_clauses.push('s.date <= ?');
    params.push(to_date);
  }
  if (favorites_only && user_id) {
    use_join = true;
    where_clauses.push('f.id IS NOT NULL');
  }

  const where = where_clauses.length > 0 ? `WHERE ${where_clauses.join(' AND ')}` : '';
  const join = use_join ? `INNER JOIN favorites f ON f.symbol = s.symbol AND f.user_identifier = '${user_id.replace(/'/g, "''")}'` : '';
  const allowed_sort = ['date', 'confidence', 'risk_reward', 'ranking_score', 'symbol', 'created_at'];
  const safe_sort = allowed_sort.includes(sort_by) ? sort_by : 'date';
  const safe_order = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const count_sql = `SELECT COUNT(*) as total FROM signals s ${join} ${where}`;
  const [count_rows] = await pool.query(count_sql, params);
  const total = count_rows[0].total;

  const data_sql = `SELECT s.* FROM signals s ${join} ${where} ORDER BY s.${safe_sort} ${safe_order} LIMIT ? OFFSET ?`;
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

async function countByWeek(date) {
  const sql = `SELECT COUNT(*) as count FROM signals WHERE YEARWEEK(date, 1) = YEARWEEK(?, 1)`;
  const [rows] = await pool.query(sql, [date]);
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

async function sumActiveCapitalRisk() {
  const sql = `SELECT COALESCE(SUM(capital_risk_inr), 0) AS t FROM signals WHERE status = 'ACTIVE'`;
  const [rows] = await pool.query(sql);
  return parseFloat(rows[0].t) || 0;
}

async function sumActiveCapitalRiskByDirection(direction) {
  const sql = `SELECT COALESCE(SUM(capital_risk_inr), 0) AS t FROM signals WHERE status = 'ACTIVE' AND direction = ?`;
  const [rows] = await pool.query(sql, [direction]);
  return parseFloat(rows[0].t) || 0;
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
  countByWeek,
  sumActiveCapitalRisk,
  sumActiveCapitalRiskByDirection,
};
