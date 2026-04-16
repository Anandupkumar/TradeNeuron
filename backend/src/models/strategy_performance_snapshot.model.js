const { pool } = require('../config/db');

async function upsert(snapshot) {
  const sql = `
    INSERT INTO strategy_performance_snapshots (
      snapshot_date, strategy_name, scope_type, scope_value,
      trade_count, win_rate_pct, avg_pnl_pct, profit_factor,
      expectancy_pct, max_drawdown_pct, recommendation,
      recommendation_reason, applied
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      trade_count = VALUES(trade_count),
      win_rate_pct = VALUES(win_rate_pct),
      avg_pnl_pct = VALUES(avg_pnl_pct),
      profit_factor = VALUES(profit_factor),
      expectancy_pct = VALUES(expectancy_pct),
      max_drawdown_pct = VALUES(max_drawdown_pct),
      recommendation = VALUES(recommendation),
      recommendation_reason = VALUES(recommendation_reason),
      applied = VALUES(applied)
  `;
  const params = [
    snapshot.snapshot_date,
    snapshot.strategy_name,
    snapshot.scope_type,
    snapshot.scope_value,
    snapshot.trade_count,
    snapshot.win_rate_pct,
    snapshot.avg_pnl_pct,
    snapshot.profit_factor,
    snapshot.expectancy_pct,
    snapshot.max_drawdown_pct,
    snapshot.recommendation,
    snapshot.recommendation_reason || null,
    snapshot.applied ? 1 : 0,
  ];
  const [result] = await pool.query(sql, params);
  return result;
}

async function findRecent(days = 30) {
  const [rows] = await pool.query(
    `SELECT * FROM strategy_performance_snapshots
     WHERE snapshot_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     ORDER BY snapshot_date DESC, strategy_name ASC, scope_type ASC, scope_value ASC`,
    [days]
  );
  return rows;
}

module.exports = { upsert, findRecent };
