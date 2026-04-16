const { logger } = require('../../middlewares/logger.middleware');
const { formatDate } = require('../../utils/date.util');
const candleModel = require('../../models/candle.model');
const indicatorModel = require('../../models/indicator.model');
const featureModel = require('../../models/feature.model');
const { nifty_index_symbol, india_vix_symbol } = require('../../utils/symbols.util');
const { nifty_50_symbols } = require('../../utils/symbols.util');
const config = require('../../config/env');
const {
  computeMarketRegime,
  computeBreadthPct,
  computePersistenceScore,
} = require('./market_regime.util');
const { applySlCapToSignal } = require('../../utils/stop_loss.util');
const { attachExitPolicy } = require('../../utils/exit_policy.util');
const { getThresholds } = require('../features/adaptive_threshold.service');
const strategyConfigModel = require('../../models/strategy_config.model');
const trendPullback = require('./trend_pullback.strategy');
const breakout = require('./breakout.strategy');
const range = require('./range.strategy');
const meanReversion = require('./mean_reversion.strategy');
const trendPullbackShort = require('./trend_pullback_short.strategy');
const breakdown = require('./breakdown.strategy');

async function checkMarketRegime() {
  const nifty_candle = await candleModel.findLatestBySymbol(nifty_index_symbol);
  const nifty_indicator = await indicatorModel.findLatestBySymbol(nifty_index_symbol);
  const vix_candle = await candleModel.findLatestBySymbol(india_vix_symbol);

  if (!nifty_candle || !nifty_indicator || !vix_candle) {
    logger.warn('Market regime check: Missing data for NIFTY or VIX');
    return { regime: 'UNKNOWN', reason: 'Missing market data' };
  }

  const nifty_close = parseFloat(nifty_candle.adjusted_close);
  const ema_200 = nifty_indicator.ema_200 != null ? parseFloat(nifty_indicator.ema_200) : null;
  const ema_20 = nifty_indicator.ema_20 != null ? parseFloat(nifty_indicator.ema_20) : null;
  const ema_50 = nifty_indicator.ema_50 != null ? parseFloat(nifty_indicator.ema_50) : null;
  const vix_close = parseFloat(vix_candle.close);

  if (ema_200 == null) {
    logger.warn('Market regime check: NIFTY EMA200 not available yet');
    return { regime: 'UNKNOWN', reason: 'NIFTY EMA200 not computed' };
  }

  let vix_threshold = config.vix_threshold;
  if (config.adaptive_thresholds_enabled) {
    const adaptive = await getThresholds(india_vix_symbol, vix_candle.date);
    if (adaptive && adaptive.vix_threshold) {
      vix_threshold = parseFloat(adaptive.vix_threshold);
    }
  }

  const breadth_snapshot = await featureModel.getBreadthSnapshot(formatDate(nifty_candle.date), nifty_50_symbols);
  const breadth_pct = computeBreadthPct(breadth_snapshot);

  const nifty_history = await candleModel.findBySymbolLast(nifty_index_symbol, 5);
  const indicator_history = await indicatorModel.findBySymbolLast(nifty_index_symbol, 5);
  const vix_history = await candleModel.findBySymbolLast(india_vix_symbol, 5);
  const vix_by_date = new Map(vix_history.map((row) => [formatDate(row.date), parseFloat(row.close)]));
  const persistence_inputs = nifty_history.map((row, idx) => ({
    nifty_close: parseFloat(row.adjusted_close),
    ema_200: indicator_history[idx] && indicator_history[idx].ema_200 != null
      ? parseFloat(indicator_history[idx].ema_200)
      : null,
    ema_20: indicator_history[idx] && indicator_history[idx].ema_20 != null
      ? parseFloat(indicator_history[idx].ema_20)
      : null,
    ema_50: indicator_history[idx] && indicator_history[idx].ema_50 != null
      ? parseFloat(indicator_history[idx].ema_50)
      : null,
    vix_close: vix_by_date.get(formatDate(row.date)),
    vix_threshold,
  })).filter((row) => row.ema_200 != null && row.vix_close != null);
  const persistence_score = computePersistenceScore(persistence_inputs);

  const regime = computeMarketRegime({
    nifty_close, ema_200, ema_20, ema_50, vix_close, vix_threshold, breadth_pct, persistence_score,
  });

  if (regime === 'BULLISH') {
    return { regime: 'BULLISH', reason: breadth_pct != null ? `Breadth ${breadth_pct.toFixed(1)}%, persistence ${persistence_score}` : null, vix_close };
  }
  if (regime === 'SIDEWAYS') {
    const nifty_range = ema_20 != null && ema_50 != null && ema_50 !== 0
      ? Math.abs(ema_20 - ema_50) / ema_50 * 100
      : 0;
    return {
      regime: 'SIDEWAYS',
      reason: `EMAs converged (range=${nifty_range.toFixed(2)}%, breadth=${breadth_pct != null ? breadth_pct.toFixed(1) : 'n/a'}%, persistence=${persistence_score})`,
      vix_close,
    };
  }
  if (regime === 'BEARISH') {
    logger.info('NIFTY below EMA200');
    return { regime: 'BEARISH', reason: `NIFTY below EMA200 (breadth=${breadth_pct != null ? breadth_pct.toFixed(1) : 'n/a'}%, persistence=${persistence_score})`, vix_close };
  }
  if (regime === 'HIGH_VOLATILITY') {
    logger.info(`India VIX at ${vix_close}, above threshold ${vix_threshold}`);
    return { regime: 'HIGH_VOLATILITY', reason: `India VIX ${vix_close} > ${vix_threshold}`, vix_close };
  }
  return { regime: 'UNKNOWN', reason: 'Insufficient inputs', vix_close };
}

async function runStrategies(symbol, date, market_regime) {
  const candle = await candleModel.findLatestBySymbol(symbol);
  const indicator = await indicatorModel.findLatestBySymbol(symbol);
  const feature = await featureModel.findLatestBySymbol(symbol);

  if (!candle || !indicator || !feature) return [];

  let enabled_strategies;
  try {
    enabled_strategies = await strategyConfigModel.getEnabled();
  } catch {
    enabled_strategies = ['TREND_PULLBACK', 'BREAKOUT', 'RANGE', 'MEAN_REVERSION', 'TREND_PULLBACK_SHORT', 'BREAKDOWN'];
  }
  const is_enabled = (name) => enabled_strategies.includes(name);

  const recent_candles = await candleModel.findBySymbolLast(symbol, 25);
  const past_candles = recent_candles.slice(0, -1);

  const raw_signals = [];

  if (market_regime === 'BULLISH' || market_regime === 'SIDEWAYS') {
    if (is_enabled('RANGE')) {
      const range_signal = range.evaluate(symbol, date, candle, indicator, feature, past_candles);
      if (range_signal) raw_signals.push(range_signal);
    }

    if (is_enabled('MEAN_REVERSION')) {
      const reversion_signal = meanReversion.evaluate(symbol, date, candle, indicator, feature, past_candles);
      if (reversion_signal) raw_signals.push(reversion_signal);
    }
  }

  if (market_regime === 'BULLISH') {
    if (is_enabled('TREND_PULLBACK')) {
      const trend_signal = trendPullback.evaluate(symbol, date, candle, indicator, feature, past_candles);
      if (trend_signal) raw_signals.push(trend_signal);
    }

    if (is_enabled('BREAKOUT')) {
      const breakout_signal = breakout.evaluate(symbol, date, candle, indicator, feature, past_candles);
      if (breakout_signal) raw_signals.push(breakout_signal);
    }
  }

  if (market_regime === 'BEARISH') {
    if (is_enabled('TREND_PULLBACK_SHORT')) {
      const short_trend = trendPullbackShort.evaluate(symbol, date, candle, indicator, feature, past_candles);
      if (short_trend) raw_signals.push(short_trend);
    }

    if (is_enabled('BREAKDOWN')) {
      const breakdown_signal = breakdown.evaluate(symbol, date, candle, indicator, feature, past_candles);
      if (breakdown_signal) raw_signals.push(breakdown_signal);
    }
  }

  if (config.max_sl_distance_pct > 0 && raw_signals.length > 0) {
    return raw_signals
      .map((s) => attachExitPolicy(s))
      .map((s) => applySlCapToSignal(s, config.max_sl_distance_pct))
      .filter(Boolean);
  }

  return raw_signals.map((s) => attachExitPolicy(s));
}

module.exports = { checkMarketRegime, runStrategies };
