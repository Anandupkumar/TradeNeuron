const { pool } = require('../config/db');

async function create(trade) {
  const sql = `
    INSERT INTO paper_trades (signal_id, symbol, direction, execution_type, entry_date, entry_price, actual_entry_price, stop_loss, target_price, status, shares_to_buy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    trade.signal_id, trade.symbol, trade.direction || 'LONG',
    trade.execution_type || 'EQUITY',
    trade.entry_date,
    trade.entry_price,
    trade.actual_entry_price || null,
    trade.stop_loss, trade.target_price,
    trade.status || 'OPEN',
    trade.shares_to_buy || null,
  ];
  const [result] = await pool.query(sql, params);
  return { id: result.insertId, ...trade };
}

async function updateActualEntry(id, actual_entry_price) {
  const sql = `UPDATE paper_trades SET actual_entry_price = ? WHERE id = ?`;
  const [result] = await pool.query(sql, [actual_entry_price, id]);
  return result;
}

async function findOpen() {
  const sql = `SELECT * FROM paper_trades WHERE status = 'OPEN' ORDER BY entry_date ASC`;
  const [rows] = await pool.query(sql);
  return rows;
}

async function updateClose(id, exit_date, exit_price, exit_reason, pnl_pct, gross_pnl_inr = null) {
  const sql = `
    UPDATE paper_trades
    SET exit_date = ?, exit_price = ?, exit_reason = ?, pnl_pct = ?, gross_pnl_inr = ?, status = 'CLOSED'
    WHERE id = ?
  `;
  const [result] = await pool.query(sql, [exit_date, exit_price, exit_reason, pnl_pct, gross_pnl_inr, id]);
  return result;
}

async function findAll({ page = 1, limit = 20, sort_by = 'entry_date', sort_order = 'DESC', status, symbol } = {}) {
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

  const where = where_clauses.length > 0 ? `WHERE ${where_clauses.join(' AND ')}` : '';
  const allowed_sort = ['entry_date', 'pnl_pct', 'created_at'];
  const safe_sort = allowed_sort.includes(sort_by) ? sort_by : 'entry_date';
  const safe_order = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const count_sql = `SELECT COUNT(*) as total FROM paper_trades ${where}`;
  const [count_rows] = await pool.query(count_sql, params);
  const total = count_rows[0].total;

  const data_sql = `SELECT * FROM paper_trades ${where} ORDER BY ${safe_sort} ${safe_order} LIMIT ? OFFSET ?`;
  const [rows] = await pool.query(data_sql, [...params, limit, offset]);

  return { rows, total, page, limit };
}

async function getSummary() {
  const sql = `
    SELECT
      COUNT(*) as total_trades,
      SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) as open_trades,
      SUM(CASE WHEN status = 'CLOSED' THEN 1 ELSE 0 END) as closed_trades,
      SUM(CASE WHEN pnl_pct > 0 THEN 1 ELSE 0 END) as winning_trades,
      SUM(CASE WHEN pnl_pct < 0 THEN 1 ELSE 0 END) as losing_trades,
      AVG(CASE WHEN status = 'CLOSED' THEN pnl_pct ELSE NULL END) as avg_pnl_pct,
      MAX(CASE WHEN status = 'CLOSED' THEN pnl_pct ELSE NULL END) as best_trade_pct,
      MIN(CASE WHEN status = 'CLOSED' THEN pnl_pct ELSE NULL END) as worst_trade_pct,
      SUM(CASE WHEN status = 'CLOSED' THEN pnl_pct ELSE 0 END) as total_pnl_pct
    FROM paper_trades
  `;
  const [rows] = await pool.query(sql);
  const row = rows[0];

  const closed = parseInt(row.closed_trades, 10) || 0;
  const winning = parseInt(row.winning_trades, 10) || 0;
  const win_rate_pct = closed > 0 ? (winning / closed) * 100 : 0;

  // Max drawdown via running cumulative PnL on closed trades
  let max_drawdown_pct = 0;
  if (closed > 0) {
    const [closed_rows] = await pool.query(
      `SELECT pnl_pct FROM paper_trades WHERE status = 'CLOSED' ORDER BY exit_date ASC, id ASC`
    );
    let cumulative = 0;
    let peak = 0;
    for (const t of closed_rows) {
      cumulative += parseFloat(t.pnl_pct) || 0;
      if (cumulative > peak) peak = cumulative;
      const drawdown = peak - cumulative;
      if (drawdown > max_drawdown_pct) max_drawdown_pct = drawdown;
    }
  }

  return {
    ...row,
    win_rate_pct: Math.round(win_rate_pct * 100) / 100,
    max_drawdown_pct: Math.round(max_drawdown_pct * 100) / 100,
  };
}

module.exports = { create, findOpen, updateClose, updateActualEntry, findAll, getSummary };
