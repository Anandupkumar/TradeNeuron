const { pool } = require('../config/db');

async function create(result) {
  const sql = `
    INSERT INTO backtest_results (
      strategy_name, run_date, train_start, train_end, test_start, test_end,
      total_signals, wins, losses, neutral, win_rate_pct, avg_return_pct,
      expectancy_pct, max_drawdown_pct, sharpe_ratio, profit_factor,
      avg_holding_days, avg_mfe_pct, avg_mae_pct, gap_open_losses,
      avg_entry_gap_pct, exit_reason_distribution, weight_config
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const params = [
    result.strategy_name, result.run_date,
    result.train_start, result.train_end,
    result.test_start, result.test_end,
    result.total_signals, result.wins, result.losses, result.neutral,
    result.win_rate_pct, result.avg_return_pct, result.expectancy_pct, result.max_drawdown_pct,
    result.sharpe_ratio, result.profit_factor, result.avg_holding_days,
    result.avg_mfe_pct, result.avg_mae_pct, result.gap_open_losses,
    result.avg_entry_gap_pct,
    JSON.stringify(result.exit_reason_distribution || {}),
    JSON.stringify(result.weight_config),
  ];
  const [row] = await pool.query(sql, params);
  return { id: row.insertId, ...result };
}

async function findAll({ page = 1, limit = 20, sort_by = 'run_date', sort_order = 'DESC', strategy_name } = {}) {
  let where_clauses = [];
  let params = [];

  if (strategy_name) {
    where_clauses.push('strategy_name = ?');
    params.push(strategy_name);
  }

  const where = where_clauses.length > 0 ? `WHERE ${where_clauses.join(' AND ')}` : '';
  const allowed_sort = ['run_date', 'win_rate_pct', 'profit_factor', 'sharpe_ratio', 'created_at'];
  const safe_sort = allowed_sort.includes(sort_by) ? sort_by : 'run_date';
  const safe_order = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;

  const count_sql = `SELECT COUNT(*) as total FROM backtest_results ${where}`;
  const [count_rows] = await pool.query(count_sql, params);
  const total = count_rows[0].total;

  const data_sql = `SELECT * FROM backtest_results ${where} ORDER BY ${safe_sort} ${safe_order} LIMIT ? OFFSET ?`;
  const [rows] = await pool.query(data_sql, [...params, limit, offset]);

  return { rows, total, page, limit };
}

async function findLatestByStrategy(strategy_name) {
  const sql = `SELECT * FROM backtest_results WHERE strategy_name = ? ORDER BY run_date DESC LIMIT 1`;
  const [rows] = await pool.query(sql, [strategy_name]);
  return rows[0] || null;
}

module.exports = { create, findAll, findLatestByStrategy };
