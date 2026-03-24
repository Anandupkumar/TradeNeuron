const { pool } = require('../config/db');

async function upsert(feature) {
  const sql = `
    INSERT INTO features (symbol, date, is_uptrend, rsi_zone, is_volume_spike, is_breakout, close_position, ema50_slope, near_support, distance_from_52w_high_pct, relative_strength_vs_nifty, is_liquid, is_ranging, z_score_20d, rvol, volume_tier, vwap, vwap_distance_pct, is_near_vwap, is_high_delivery)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      is_uptrend = VALUES(is_uptrend),
      rsi_zone = VALUES(rsi_zone),
      is_volume_spike = VALUES(is_volume_spike),
      is_breakout = VALUES(is_breakout),
      close_position = VALUES(close_position),
      ema50_slope = VALUES(ema50_slope),
      near_support = VALUES(near_support),
      distance_from_52w_high_pct = VALUES(distance_from_52w_high_pct),
      relative_strength_vs_nifty = VALUES(relative_strength_vs_nifty),
      is_liquid = VALUES(is_liquid),
      is_ranging = VALUES(is_ranging),
      z_score_20d = VALUES(z_score_20d),
      rvol = VALUES(rvol),
      volume_tier = VALUES(volume_tier),
      vwap = VALUES(vwap),
      vwap_distance_pct = VALUES(vwap_distance_pct),
      is_near_vwap = VALUES(is_near_vwap),
      is_high_delivery = VALUES(is_high_delivery)
  `;
  const params = [
    feature.symbol, feature.date,
    feature.is_uptrend ? 1 : 0, feature.rsi_zone,
    feature.is_volume_spike ? 1 : 0, feature.is_breakout ? 1 : 0,
    feature.close_position != null ? feature.close_position : null,
    feature.ema50_slope != null ? feature.ema50_slope : null,
    feature.near_support ? 1 : 0,
    feature.distance_from_52w_high_pct, feature.relative_strength_vs_nifty,
    feature.is_liquid ? 1 : 0,
    feature.is_ranging ? 1 : 0,
    feature.z_score_20d != null ? feature.z_score_20d : null,
    feature.rvol != null ? feature.rvol : null,
    feature.volume_tier || 'normal',
    feature.vwap != null ? feature.vwap : null,
    feature.vwap_distance_pct != null ? feature.vwap_distance_pct : null,
    feature.is_near_vwap != null ? (feature.is_near_vwap ? 1 : 0) : null,
    feature.is_high_delivery != null ? (feature.is_high_delivery ? 1 : 0) : null,
  ];
  const [result] = await pool.query(sql, params);
  return result;
}

async function bulkUpsert(features) {
  if (features.length === 0) return;
  const sql = `
    INSERT INTO features (symbol, date, is_uptrend, rsi_zone, is_volume_spike, is_breakout, close_position, ema50_slope, near_support, distance_from_52w_high_pct, relative_strength_vs_nifty, is_liquid, is_ranging, z_score_20d, rvol, volume_tier, vwap, vwap_distance_pct, is_near_vwap, is_high_delivery)
    VALUES ?
    ON DUPLICATE KEY UPDATE
      is_uptrend = VALUES(is_uptrend),
      rsi_zone = VALUES(rsi_zone),
      is_volume_spike = VALUES(is_volume_spike),
      is_breakout = VALUES(is_breakout),
      close_position = VALUES(close_position),
      ema50_slope = VALUES(ema50_slope),
      near_support = VALUES(near_support),
      distance_from_52w_high_pct = VALUES(distance_from_52w_high_pct),
      relative_strength_vs_nifty = VALUES(relative_strength_vs_nifty),
      is_liquid = VALUES(is_liquid),
      is_ranging = VALUES(is_ranging),
      z_score_20d = VALUES(z_score_20d),
      rvol = VALUES(rvol),
      volume_tier = VALUES(volume_tier),
      vwap = VALUES(vwap),
      vwap_distance_pct = VALUES(vwap_distance_pct),
      is_near_vwap = VALUES(is_near_vwap),
      is_high_delivery = VALUES(is_high_delivery)
  `;
  const values = features.map((f) => [
    f.symbol, f.date,
    f.is_uptrend ? 1 : 0, f.rsi_zone,
    f.is_volume_spike ? 1 : 0, f.is_breakout ? 1 : 0,
    f.close_position != null ? f.close_position : null,
    f.ema50_slope != null ? f.ema50_slope : null,
    f.near_support ? 1 : 0,
    f.distance_from_52w_high_pct, f.relative_strength_vs_nifty,
    f.is_liquid ? 1 : 0,
    f.is_ranging ? 1 : 0,
    f.z_score_20d != null ? f.z_score_20d : null,
    f.rvol != null ? f.rvol : null,
    f.volume_tier || 'normal',
    f.vwap != null ? f.vwap : null,
    f.vwap_distance_pct != null ? f.vwap_distance_pct : null,
    f.is_near_vwap != null ? (f.is_near_vwap ? 1 : 0) : null,
    f.is_high_delivery != null ? (f.is_high_delivery ? 1 : 0) : null,
  ]);
  const [result] = await pool.query(sql, [values]);
  return result;
}

async function findBySymbolAndDate(symbol, date) {
  const sql = `SELECT * FROM features WHERE symbol = ? AND date = ?`;
  const [rows] = await pool.query(sql, [symbol, date]);
  return rows[0] || null;
}

async function findBySymbolAndDateRange(symbol, start_date, end_date) {
  const sql = `
    SELECT * FROM features
    WHERE symbol = ? AND date BETWEEN ? AND ?
    ORDER BY date ASC
  `;
  const [rows] = await pool.query(sql, [symbol, start_date, end_date]);
  return rows;
}

async function findLatestBySymbol(symbol) {
  const sql = `SELECT * FROM features WHERE symbol = ? ORDER BY date DESC LIMIT 1`;
  const [rows] = await pool.query(sql, [symbol]);
  return rows[0] || null;
}

module.exports = {
  upsert,
  bulkUpsert,
  findBySymbolAndDate,
  findBySymbolAndDateRange,
  findLatestBySymbol,
};
