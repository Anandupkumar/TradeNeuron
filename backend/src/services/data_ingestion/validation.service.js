const { logger } = require('../../middlewares/logger.middleware');
const candleModel = require('../../models/candle.model');
const { countTradingDays, formatDate } = require('../../utils/date.util');

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

module.exports = { validateData };
