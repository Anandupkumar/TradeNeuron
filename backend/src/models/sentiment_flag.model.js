const { pool } = require('../config/db');

async function upsert(flag) {
  const sql = `
    INSERT INTO sentiment_flags (symbol, flag_date, sentiment, headline, source, confidence, finnhub_score, overridden)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      sentiment = VALUES(sentiment),
      headline = VALUES(headline),
      source = VALUES(source),
      confidence = VALUES(confidence),
      finnhub_score = VALUES(finnhub_score),
      overridden = VALUES(overridden)
  `;
  const params = [
    flag.symbol, flag.flag_date, flag.sentiment,
    flag.headline || null, flag.source || 'GOOGLE_NEWS_RSS',
    flag.confidence || 'HIGH',
    flag.finnhub_score != null ? flag.finnhub_score : null,
    flag.overridden ? 1 : 0,
  ];
  const [result] = await pool.query(sql, params);
  return result;
}

async function findBySymbolAndDate(symbol, flag_date) {
  const sql = `SELECT * FROM sentiment_flags WHERE symbol = ? AND flag_date = ?`;
  const [rows] = await pool.query(sql, [symbol, flag_date]);
  return rows[0] || null;
}

module.exports = { upsert, findBySymbolAndDate };
