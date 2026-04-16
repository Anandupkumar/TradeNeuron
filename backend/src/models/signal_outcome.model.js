const { pool } = require('../config/db');

async function create(outcome) {
  const sql = `
    INSERT INTO signal_outcomes (
      signal_id, outcome, strategy, raw_confidence, confidence_bucket,
      ranking_score, market_regime, sector, relative_strength_vs_nifty,
      rs_bucket, bars_held, mfe_pct, mae_pct, gap_open_loss,
      expected_entry_price, actual_entry_price, entry_slippage_pct,
      paper_trade_pnl_pct, paper_trade_exit_reason, features_json, resolved_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      outcome = VALUES(outcome),
      strategy = VALUES(strategy),
      raw_confidence = VALUES(raw_confidence),
      confidence_bucket = VALUES(confidence_bucket),
      ranking_score = VALUES(ranking_score),
      market_regime = VALUES(market_regime),
      sector = VALUES(sector),
      relative_strength_vs_nifty = VALUES(relative_strength_vs_nifty),
      rs_bucket = VALUES(rs_bucket),
      bars_held = VALUES(bars_held),
      mfe_pct = VALUES(mfe_pct),
      mae_pct = VALUES(mae_pct),
      gap_open_loss = VALUES(gap_open_loss),
      expected_entry_price = VALUES(expected_entry_price),
      actual_entry_price = VALUES(actual_entry_price),
      entry_slippage_pct = VALUES(entry_slippage_pct),
      paper_trade_pnl_pct = VALUES(paper_trade_pnl_pct),
      paper_trade_exit_reason = VALUES(paper_trade_exit_reason),
      features_json = VALUES(features_json),
      resolved_at = VALUES(resolved_at)
  `;
  const params = [
    outcome.signal_id,
    outcome.outcome,
    outcome.strategy || null,
    outcome.raw_confidence != null ? outcome.raw_confidence : null,
    outcome.confidence_bucket != null ? outcome.confidence_bucket : null,
    outcome.ranking_score != null ? outcome.ranking_score : null,
    outcome.market_regime || null,
    outcome.sector || null,
    outcome.relative_strength_vs_nifty != null ? outcome.relative_strength_vs_nifty : null,
    outcome.rs_bucket || null,
    outcome.bars_held != null ? outcome.bars_held : null,
    outcome.mfe_pct != null ? outcome.mfe_pct : null,
    outcome.mae_pct != null ? outcome.mae_pct : null,
    outcome.gap_open_loss ? 1 : 0,
    outcome.expected_entry_price != null ? outcome.expected_entry_price : null,
    outcome.actual_entry_price != null ? outcome.actual_entry_price : null,
    outcome.entry_slippage_pct != null ? outcome.entry_slippage_pct : null,
    outcome.paper_trade_pnl_pct != null ? outcome.paper_trade_pnl_pct : null,
    outcome.paper_trade_exit_reason || null,
    outcome.features_json ? JSON.stringify(outcome.features_json) : null,
    outcome.resolved_at,
  ];
  const [result] = await pool.query(sql, params);
  return result;
}

async function findRecent(days = 90) {
  const sql = `
    SELECT * FROM signal_outcomes
    WHERE resolved_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    ORDER BY resolved_at DESC
  `;
  const [rows] = await pool.query(sql, [days]);
  return rows;
}

async function updatePaperTradeComparison(signal_id, paper_trade) {
  const sql = `
    UPDATE signal_outcomes
    SET actual_entry_price = COALESCE(?, actual_entry_price),
        entry_slippage_pct = COALESCE(?, entry_slippage_pct),
        paper_trade_pnl_pct = ?,
        paper_trade_exit_reason = ?
    WHERE signal_id = ?
  `;
  const [result] = await pool.query(sql, [
    paper_trade.actual_entry_price != null ? paper_trade.actual_entry_price : null,
    paper_trade.entry_slippage_pct != null ? paper_trade.entry_slippage_pct : null,
    paper_trade.pnl_pct != null ? paper_trade.pnl_pct : null,
    paper_trade.exit_reason || null,
    signal_id,
  ]);
  return result;
}

module.exports = { create, findRecent, updatePaperTradeComparison };
