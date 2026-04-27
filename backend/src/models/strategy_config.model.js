const { pool } = require('../config/db');

async function getEnabled() {
  const sql = `SELECT strategy_name FROM strategy_config WHERE is_enabled = 1`;
  const [rows] = await pool.query(sql);
  return rows.map((r) => r.strategy_name);
}

async function getAll() {
  const sql = `SELECT * FROM strategy_config ORDER BY strategy_name`;
  const [rows] = await pool.query(sql);
  return rows;
}

async function setEnabled(strategy_name, is_enabled, reason = null) {
  const sql = `
    UPDATE strategy_config
    SET is_enabled = ?,
        disabled_at = ?,
        disabled_reason = ?
    WHERE strategy_name = ?
  `;
  const disabled_at = is_enabled ? null : new Date();
  const disabled_reason = is_enabled ? null : reason;
  const [result] = await pool.query(sql, [is_enabled ? 1 : 0, disabled_at, disabled_reason, strategy_name]);
  return result;
}

async function getByName(strategy_name) {
  const [rows] = await pool.query(
    'SELECT * FROM strategy_config WHERE strategy_name = ? LIMIT 1',
    [strategy_name]
  );
  return rows[0] || null;
}

// Phase C / Fix 7: persist the most recent risk-budget multiplier for a strategy.
async function updateRiskBudget(strategy_name, multiplier, trade_count, expectancy_pct) {
  const sql = `
    UPDATE strategy_config
       SET risk_budget_multiplier = ?,
           risk_budget_updated_at = CURRENT_TIMESTAMP,
           risk_budget_trade_count = ?,
           risk_budget_expectancy_pct = ?
     WHERE strategy_name = ?
  `;
  const [result] = await pool.query(sql, [
    multiplier,
    trade_count,
    expectancy_pct,
    strategy_name,
  ]);
  return result;
}

module.exports = { getEnabled, getAll, setEnabled, getByName, updateRiskBudget };
