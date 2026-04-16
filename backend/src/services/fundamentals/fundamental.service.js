const { logger } = require('../../middlewares/logger.middleware');
const { fetchQuoteSummary } = require('../data_ingestion/yahoo.service');
const { FundamentalError } = require('../../utils/errors');
const { roundDecimal } = require('../../utils/math.util');
const { formatDate } = require('../../utils/date.util');
const config = require('../../config/env');
const fundamentalModel = require('../../models/fundamental.model');

async function fetchFundamentals(symbol) {
  try {
    const summary = await fetchQuoteSummary(symbol);

    const debt_to_equity = summary.financialData?.debtToEquity ?? null;
    const eps_growth_yoy = summary.defaultKeyStatistics?.earningsQuarterlyGrowth ?? null;
    const revenue_growth = summary.financialData?.revenueGrowth ?? null;
    const promoter_pledge = summary.majorHoldersBreakdown?.insidersPercentHeld
      ? roundDecimal(summary.majorHoldersBreakdown.insidersPercentHeld * 100, 4)
      : null;

    let next_earnings_date = null;
    const earnings_ts = summary.calendarEvents?.earnings?.earningsDate?.[0]?.fmt
      ?? summary.calendarEvents?.earnings?.earningsDate?.[0];
    if (earnings_ts != null) {
      if (typeof earnings_ts === 'string' && /^\d{4}-\d{2}-\d{2}/.test(earnings_ts)) {
        next_earnings_date = earnings_ts.slice(0, 10);
      } else if (typeof earnings_ts === 'number') {
        next_earnings_date = formatDate(new Date(earnings_ts * 1000));
      }
    }
    if (!next_earnings_date && summary.earnings?.earningsChart?.earningsDate?.length) {
      const d = summary.earnings.earningsChart.earningsDate[0];
      if (typeof d === 'number') next_earnings_date = formatDate(new Date(d * 1000));
    }

    return {
      symbol,
      debt_to_equity: debt_to_equity != null ? roundDecimal(debt_to_equity, 4) : null,
      eps_growth_yoy: eps_growth_yoy != null ? roundDecimal(eps_growth_yoy, 4) : null,
      revenue_growth: revenue_growth != null ? roundDecimal(revenue_growth, 4) : null,
      promoter_pledge,
      next_earnings_date,
    };
  } catch (error) {
    throw new FundamentalError(`Failed to fetch fundamentals for ${symbol}: ${error.message}`);
  }
}

function computeHealthFlag(fundamentals) {
  if (fundamentals.debt_to_equity != null && fundamentals.debt_to_equity > config.max_debt_to_equity) {
    return { is_healthy: false, reason: `D/E ratio ${fundamentals.debt_to_equity} exceeds ${config.max_debt_to_equity}` };
  }

  if (fundamentals.eps_growth_yoy != null && fundamentals.eps_growth_yoy < 0) {
    return { is_healthy: false, reason: `EPS growth negative (${fundamentals.eps_growth_yoy})` };
  }

  if (fundamentals.revenue_growth != null && fundamentals.revenue_growth < 0) {
    return { is_healthy: false, reason: `Revenue growth negative (${fundamentals.revenue_growth})` };
  }

  if (fundamentals.promoter_pledge != null && fundamentals.promoter_pledge > config.max_promoter_pledge_pct) {
    return { is_healthy: false, reason: `Promoter pledge at ${fundamentals.promoter_pledge}% exceeds ${config.max_promoter_pledge_pct}%` };
  }

  return { is_healthy: true, reason: null };
}

async function refreshFundamentals(symbol) {
  const data = await fetchFundamentals(symbol);
  const { is_healthy, reason } = computeHealthFlag(data);

  if (!is_healthy) {
    logger.info(`${symbol} marked unhealthy: ${reason}`);
  }

  await fundamentalModel.upsert({
    symbol,
    fetched_date: formatDate(new Date()),
    debt_to_equity: data.debt_to_equity,
    eps_growth_yoy: data.eps_growth_yoy,
    revenue_growth: data.revenue_growth,
    promoter_pledge: data.promoter_pledge,
    next_earnings_date: data.next_earnings_date ?? null,
    is_healthy,
  });

  return { symbol, is_healthy, reason };
}

module.exports = { fetchFundamentals, computeHealthFlag, refreshFundamentals };
