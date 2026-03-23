const config = require('../../config/env');
const { logger } = require('../../middlewares/logger.middleware');
const { withRetry } = require('../../utils/retry.util');
const { DataFetchError } = require('../../utils/errors');
const { formatDate } = require('../../utils/date.util');
const { roundDecimal } = require('../../utils/math.util');

let _yf;
async function getYf() {
  if (!_yf) {
    const mod = await import('yahoo-finance2');
    _yf = mod.default;
  }
  return _yf;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchYahooCandles(symbol, start_date, end_date) {
  const label = `Yahoo candles for ${symbol}`;

  const yf = await getYf();
  const candles = await withRetry(
    async () => {
      const result = await yf.historical(symbol, {
        period1: start_date,
        period2: end_date,
        interval: '1d',
      });
      return result;
    },
    {
      max_retries: config.yahoo_max_retries,
      backoff_base_ms: config.yahoo_backoff_base_ms,
      label,
    }
  );

  await sleep(config.yahoo_throttle_ms);

  if (!candles || candles.length === 0) {
    logger.warn(`${label}: No data returned`);
    return [];
  }

  return candles.map((c) => ({
    symbol,
    date: formatDate(c.date),
    open: roundDecimal(c.open),
    high: roundDecimal(c.high),
    low: roundDecimal(c.low),
    close: roundDecimal(c.close),
    adjusted_close: roundDecimal(c.adjClose ?? c.close),
    volume: c.volume || 0,
    source: 'YAHOO',
  }));
}

async function fetchQuoteSummary(symbol) {
  const label = `Yahoo quoteSummary for ${symbol}`;

  const yf = await getYf();
  const summary = await withRetry(
    async () => {
      const result = await yf.quoteSummary(symbol, {
        modules: ['defaultKeyStatistics', 'financialData', 'earnings'],
      });
      return result;
    },
    {
      max_retries: config.yahoo_max_retries,
      backoff_base_ms: config.yahoo_backoff_base_ms,
      label,
    }
  );

  await sleep(config.yahoo_throttle_ms);

  if (!summary) {
    throw new DataFetchError(`${label}: No data returned`);
  }

  return summary;
}

module.exports = { fetchYahooCandles, fetchQuoteSummary };
