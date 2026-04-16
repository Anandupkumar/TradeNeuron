const { pool } = require('../config/db');

async function upsert(run) {
  const sql = `
    INSERT INTO shadow_validation_runs (
      comparison_date, regime, candidate_count, baseline_selected,
      improved_selected, overlap_selected, baseline_selection,
      improved_selection, baseline_avg_confidence,
      improved_avg_ranking_score, criteria_json, promotion_ready
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      candidate_count = VALUES(candidate_count),
      baseline_selected = VALUES(baseline_selected),
      improved_selected = VALUES(improved_selected),
      overlap_selected = VALUES(overlap_selected),
      baseline_selection = VALUES(baseline_selection),
      improved_selection = VALUES(improved_selection),
      baseline_avg_confidence = VALUES(baseline_avg_confidence),
      improved_avg_ranking_score = VALUES(improved_avg_ranking_score),
      criteria_json = VALUES(criteria_json),
      promotion_ready = VALUES(promotion_ready)
  `;
  const params = [
    run.comparison_date,
    run.regime,
    run.candidate_count,
    run.baseline_selected,
    run.improved_selected,
    run.overlap_selected,
    JSON.stringify(run.baseline_selection || []),
    JSON.stringify(run.improved_selection || []),
    run.baseline_avg_confidence != null ? run.baseline_avg_confidence : null,
    run.improved_avg_ranking_score != null ? run.improved_avg_ranking_score : null,
    run.criteria_json ? JSON.stringify(run.criteria_json) : null,
    run.promotion_ready ? 1 : 0,
  ];
  const [result] = await pool.query(sql, params);
  return result;
}

async function findRecent(days = 30) {
  const [rows] = await pool.query(
    `SELECT * FROM shadow_validation_runs
     WHERE comparison_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
     ORDER BY comparison_date DESC, regime ASC`,
    [days]
  );
  return rows;
}

module.exports = { upsert, findRecent };
