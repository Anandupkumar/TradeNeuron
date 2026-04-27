// Phase B / Fix 5: 20-day return-correlation service.
//
// Replaces the sector-proxy divisor in signal sizing with a statistical divisor.
// For a candidate symbol we pull the last N adjusted-close candles, convert to
// daily log returns, and compute Pearson correlation against every candidate in
// the provided active+batch pool. We count how many have |corr| >= threshold
// (default 0.7) and expose that count to the sizing layer, which adds 1 and
// divides the risk budget by it — exactly mirroring the sector proxy's semantics.
//
// The cost profile is cheap: O(K * N) per candidate where K <= 50 active symbols
// and N = 20 bars. No external calls, no extra DB joins.

const { logger } = require('../../middlewares/logger.middleware');
const candleModel = require('../../models/candle.model');
const { roundDecimal } = require('../../utils/math.util');

function toLogReturns(candles) {
  const out = [];
  for (let i = 1; i < candles.length; i++) {
    const prev = Number.parseFloat(candles[i - 1].adjusted_close != null
      ? candles[i - 1].adjusted_close
      : candles[i - 1].close);
    const cur = Number.parseFloat(candles[i].adjusted_close != null
      ? candles[i].adjusted_close
      : candles[i].close);
    if (!(prev > 0) || !(cur > 0)) continue;
    out.push(Math.log(cur / prev));
  }
  return out;
}

function pearson(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 5) return null;
  let sum_a = 0;
  let sum_b = 0;
  for (let i = 0; i < n; i++) {
    sum_a += a[i];
    sum_b += b[i];
  }
  const mean_a = sum_a / n;
  const mean_b = sum_b / n;
  let cov = 0;
  let var_a = 0;
  let var_b = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - mean_a;
    const db = b[i] - mean_b;
    cov += da * db;
    var_a += da * da;
    var_b += db * db;
  }
  if (var_a === 0 || var_b === 0) return null;
  return cov / Math.sqrt(var_a * var_b);
}

async function fetchReturnSeries(symbol, as_of_date, lookback_days) {
  // Need lookback+1 candles so we get `lookback` returns.
  const candles = as_of_date
    ? await candleModel.findTrailingBefore(symbol, as_of_date, lookback_days + 1)
    : await candleModel.findBySymbolLast(symbol, lookback_days + 1);
  if (!candles || candles.length < 6) return null;
  return toLogReturns(candles);
}

/**
 * For `candidate_symbol`, count how many symbols in `pool_symbols` have
 * |corr(candidate_returns, pool_returns)| >= threshold.
 *
 * @param {string} candidate_symbol
 * @param {string[]} pool_symbols  — active + batch peers in the same direction
 * @param {number} threshold       — absolute correlation cutoff (0..1)
 * @param {{lookback_days?: number, as_of_date?: string}} opts
 * @returns {Promise<number>} integer count (0 when pool is empty or data missing)
 */
async function countHighlyCorrelatedActive(candidate_symbol, pool_symbols, threshold = 0.7, opts = {}) {
  if (!pool_symbols || pool_symbols.length === 0) return 0;
  const lookback = Number.parseInt(opts.lookback_days || 20, 10);
  const as_of_date = opts.as_of_date || null;

  const candidate_returns = await fetchReturnSeries(candidate_symbol, as_of_date, lookback);
  if (!candidate_returns) {
    logger.info(`Correlation: candidate ${candidate_symbol} has insufficient candles — returning 0 (fail-open)`);
    return 0;
  }

  let count = 0;
  for (const peer of pool_symbols) {
    if (peer === candidate_symbol) continue;
    try {
      const peer_returns = await fetchReturnSeries(peer, as_of_date, lookback);
      if (!peer_returns) continue;
      const corr = pearson(candidate_returns, peer_returns);
      if (corr == null) continue;
      if (Math.abs(corr) >= threshold) {
        logger.info(`Correlation: ${candidate_symbol} vs ${peer} = ${roundDecimal(corr, 3)} (>= ${threshold})`);
        count++;
      }
    } catch (err) {
      logger.warn(`Correlation fetch failed for ${peer}: ${err.message}`);
    }
  }
  return count;
}

module.exports = {
  countHighlyCorrelatedActive,
  fetchReturnSeries,
  pearson,
  toLogReturns,
};
