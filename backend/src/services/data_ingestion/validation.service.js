const { logger } = require('../../middlewares/logger.middleware');
const candleModel = require('../../models/candle.model');
const { pool } = require('../../config/db');
const { countTradingDays, formatDate } = require('../../utils/date.util');
const { nifty_50_symbols } = require('../../utils/symbols.util');

async function validateData(symbol, start_date, end_date) {
  const dates = await candleModel.findDatesForSymbol(symbol);
  const date_strings = dates.map((d) => formatDate(d));
  const date_set = new Set(date_strings);

  const expected_trading_days = countTradingDays(start_date, end_date);
  const actual_days = date_strings.filter((d) => d >= formatDate(start_date) && d <= formatDate(end_date)).length;

  const gaps = [];
  const current = new Date(start_date);
  const end = new Date(end_date);

  while (current <= end) {
    const date_str = formatDate(current);
    if (countTradingDays(date_str, date_str) === 1 && !date_set.has(date_str)) {
      gaps.push(date_str);
    }
    current.setDate(current.getDate() + 1);
  }

  const is_valid = gaps.length === 0;
  const completeness_pct = expected_trading_days > 0
    ? ((actual_days / expected_trading_days) * 100).toFixed(2)
    : 0;

  if (!is_valid) {
    logger.warn(`Data gaps for ${symbol}: ${gaps.length} missing trading days (${completeness_pct}% complete)`);
  }

  return {
    symbol,
    is_valid,
    expected_trading_days,
    actual_days,
    completeness_pct: parseFloat(completeness_pct),
    gaps,
  };
}

async function checkCandleSourceQuality(date) {
  const placeholders = nifty_50_symbols.map(() => '?').join(',');
  const [rows] = await pool.query(
    `SELECT symbol, source, adjusted_close, close
     FROM candles
     WHERE date = ?
       AND symbol IN (${placeholders})`,
    [date, ...nifty_50_symbols]
  );

  const bhavcopy_symbols = rows
    .filter((r) => r.source === 'BHAVCOPY')
    .map((r) => r.symbol);

  const suspicious_gap_symbols = rows.filter((r) => {
    if (!r.adjusted_close || !r.close) return false;
    const adj = parseFloat(r.adjusted_close);
    const cls = parseFloat(r.close);
    if (cls === 0) return false;
    const gap_pct = Math.abs(adj - cls) / cls * 100;
    return gap_pct > 20;
  }).map((r) => r.symbol);

  const bhavcopy_ratio = nifty_50_symbols.length > 0
    ? bhavcopy_symbols.length / nifty_50_symbols.length
    : 0;

  const suspect_symbols = [...new Set([...bhavcopy_symbols, ...suspicious_gap_symbols])];

  return {
    total_symbols: nifty_50_symbols.length,
    yahoo_count: rows.length - bhavcopy_symbols.length,
    bhavcopy_count: bhavcopy_symbols.length,
    bhavcopy_ratio,
    bhavcopy_symbols,
    suspicious_gap_symbols,
    quality: bhavcopy_ratio > 0.20 ? 'POOR' : 'OK',
    suspect_symbols,
  };
}

module.exports = { validateData, checkCandleSourceQuality };
