const axios = require('axios');
const config = require('../../config/env');
const { logger } = require('../../middlewares/logger.middleware');
const { withRetry } = require('../../utils/retry.util');
const { DataFetchError } = require('../../utils/errors');
const { formatDate } = require('../../utils/date.util');
const { roundDecimal } = require('../../utils/math.util');

const YAHOO_BASE = 'https://query2.finance.yahoo.com';

const yahoo_client = axios.create({
  baseURL: YAHOO_BASE,
  timeout: 30000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    Accept: 'application/json',
  },
});

function toUnix(date_str) {
  return Math.floor(new Date(date_str).getTime() / 1000);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchYahooCandles(symbol, start_date, end_date) {
  const label = `Yahoo candles for ${symbol}`;

  const chart_result = await withRetry(
    async () => {
      const { data } = await yahoo_client.get(`/v8/finance/chart/${encodeURIComponent(symbol)}`, {
        params: {
          interval: '1d',
          period1: toUnix(start_date),
          period2: toUnix(end_date),
          events: 'div|split',
        },
      });

      if (data.chart?.error) {
        throw new DataFetchError(`${label}: ${data.chart.error.description}`);
      }
      return data.chart?.result?.[0];
    },
    {
      max_retries: config.yahoo_max_retries,
      backoff_base_ms: config.yahoo_backoff_base_ms,
      label,
    }
  );

  await sleep(config.yahoo_throttle_ms);

  if (!chart_result || !chart_result.timestamp) {
    logger.warn(`${label}: No data returned`);
    return [];
  }

  const timestamps = chart_result.timestamp;
  const quote = chart_result.indicators?.quote?.[0] || {};
  const adj = chart_result.indicators?.adjclose?.[0]?.adjclose || [];

  return timestamps
    .map((ts, i) => {
      const close_val = quote.close?.[i];
      if (close_val == null) return null;
      return {
        symbol,
        date: formatDate(new Date(ts * 1000)),
        open: roundDecimal(quote.open?.[i]),
        high: roundDecimal(quote.high?.[i]),
        low: roundDecimal(quote.low?.[i]),
        close: roundDecimal(close_val),
        adjusted_close: roundDecimal(adj[i] ?? close_val),
        volume: quote.volume?.[i] || 0,
        source: 'YAHOO',
      };
    })
    .filter(Boolean);
}

async function fetchQuoteSummary(symbol) {
  const label = `Yahoo quoteSummary for ${symbol}`;

  const summary = await withRetry(
    async () => {
      const { data } = await yahoo_client.get(
        `/v10/finance/quoteSummary/${encodeURIComponent(symbol)}`,
        {
          params: {
            modules: 'defaultKeyStatistics,financialData,earnings,majorHoldersBreakdown',
          },
        }
      );

      if (data.quoteSummary?.error) {
        throw new DataFetchError(`${label}: ${data.quoteSummary.error.description}`);
      }
      return data.quoteSummary?.result?.[0];
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

async function probeYahooApi() {
  try {
    const { status } = await yahoo_client.get('/v8/finance/spark', {
      params: { symbols: 'TCS.NS', range: '1d', interval: '1d' },
      timeout: 10000,
    });
    return status === 200;
  } catch {
    return false;
  }
}

module.exports = { fetchYahooCandles, fetchQuoteSummary, probeYahooApi };
