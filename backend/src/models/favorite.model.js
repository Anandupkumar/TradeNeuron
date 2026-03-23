const { pool } = require('../config/db');

async function create(user_identifier, symbol, notes) {
  const sql = `
    INSERT INTO favorites (user_identifier, symbol, notes)
    VALUES (?, ?, ?)
  `;
  const [result] = await pool.query(sql, [user_identifier, symbol, notes || null]);
  return { id: result.insertId, user_identifier, symbol, notes };
}

async function remove(user_identifier, symbol) {
  const sql = `DELETE FROM favorites WHERE user_identifier = ? AND symbol = ?`;
  const [result] = await pool.query(sql, [user_identifier, symbol]);
  return result.affectedRows > 0;
}

async function findByUser(user_identifier) {
  const sql = `
    SELECT f.*,
      (SELECT s.status FROM signals s WHERE s.symbol = f.symbol AND s.status = 'ACTIVE' ORDER BY s.date DESC LIMIT 1) as latest_signal_status,
      (SELECT s.confidence FROM signals s WHERE s.symbol = f.symbol AND s.status = 'ACTIVE' ORDER BY s.date DESC LIMIT 1) as latest_signal_confidence,
      (SELECT c1.adjusted_close FROM candles c1 WHERE c1.symbol = f.symbol ORDER BY c1.date DESC LIMIT 1) as latest_price,
      (SELECT
        CASE WHEN c2.adjusted_close IS NOT NULL AND c2.adjusted_close != 0
          THEN ((c_latest.adjusted_close - c2.adjusted_close) / c2.adjusted_close) * 100
          ELSE NULL
        END
        FROM candles c_latest
        JOIN candles c2 ON c2.symbol = f.symbol AND c2.date = (
          SELECT MAX(c3.date) FROM candles c3 WHERE c3.symbol = f.symbol AND c3.date < c_latest.date
        )
        WHERE c_latest.symbol = f.symbol
        ORDER BY c_latest.date DESC LIMIT 1
      ) as change_pct
    FROM favorites f
    WHERE f.user_identifier = ?
    ORDER BY f.created_at DESC
  `;
  const [rows] = await pool.query(sql, [user_identifier]);
  return rows;
}

async function findOne(user_identifier, symbol) {
  const sql = `SELECT * FROM favorites WHERE user_identifier = ? AND symbol = ?`;
  const [rows] = await pool.query(sql, [user_identifier, symbol]);
  return rows[0] || null;
}

module.exports = { create, remove, findByUser, findOne };
