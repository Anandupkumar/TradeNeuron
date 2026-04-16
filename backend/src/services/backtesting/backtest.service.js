const { logger } = require('../../middlewares/logger.middleware');
const { formatDate } = require('../../utils/date.util');
const { roundDecimal } = require('../../utils/math.util');
const config = require('../../config/env');
const candleModel = require('../../models/candle.model');
const { computeIndicators } = require('../indicators/index');
const { computeFeatures } = require('../features/feature.service');
const trendPullback = require('../strategies/trend_pullback.strategy');
const breakout = require('../strategies/breakout.strategy');
const range = require('../strategies/range.strategy');
const meanReversion = require('../strategies/mean_reversion.strategy');
const trendPullbackShort = require('../strategies/trend_pullback_short.strategy');
const breakdown = require('../strategies/breakdown.strategy');
const { SCORING_WEIGHTS, EXIT_POLICY_PROFILES } = require('../../config/constants');
const { calculateMetrics } = require('./metrics.service');
const backtestResultModel = require('../../models/backtest_result.model');
const { nifty_50_symbols, nifty_index_symbol, india_vix_symbol } = require('../../utils/symbols.util');
const nifty50CompositionModel = require('../../models/nifty50_composition.model');
const { computeMarketRegime, computePersistenceScore } = require('../strategies/market_regime.util');
const { applySlCapToSignal } = require('../../utils/stop_loss.util');
const {
  attachExitPolicy,
  evaluateSignalExit,
  deriveConservativeTarget,
} = require('../../utils/exit_policy.util');

function evaluateOutcome(signal, future_candles) {
  return evaluateSignalExit(signal, future_candles, { force_close_on_last_candle: true });
}

function calculateNetReturn(entry_price, exit_price, direction = 'LONG') {
  const cost = (config.slippage_pct + config.brokerage_pct) / 100;
  const effective_entry = direction === 'SHORT'
    ? entry_price * (1 - cost)
    : entry_price * (1 + cost);
  const effective_exit = direction === 'SHORT'
    ? exit_price * (1 + cost)
    : exit_price * (1 - cost);
  return ((effective_exit - effective_entry) / effective_entry) * 100;
}

function buildRegimeByDateMap(nifty_candles, nifty_indicators, vix_by_date, breadth_by_date = new Map()) {
  const map = new Map();
  for (let i = 0; i < nifty_candles.length; i++) {
    const d = formatDate(nifty_candles[i].date);
    const ind = nifty_indicators[i];
    const vix_close = vix_by_date.get(d);
    if (!ind || vix_close == null || Number.isNaN(vix_close)) {
      map.set(d, 'UNKNOWN');
      continue;
    }
    const persistence_window = [];
    for (let j = Math.max(0, i - 4); j <= i; j++) {
      const history_ind = nifty_indicators[j];
      const history_vix = vix_by_date.get(formatDate(nifty_candles[j].date));
      if (!history_ind || history_vix == null) continue;
      persistence_window.push({
        nifty_close: parseFloat(nifty_candles[j].adjusted_close),
        ema_200: history_ind.ema_200 != null ? parseFloat(history_ind.ema_200) : null,
        ema_20: history_ind.ema_20 != null ? parseFloat(history_ind.ema_20) : null,
        ema_50: history_ind.ema_50 != null ? parseFloat(history_ind.ema_50) : null,
        vix_close: history_vix,
        vix_threshold: config.vix_threshold,
      });
    }
    const regime = computeMarketRegime({
      nifty_close: parseFloat(nifty_candles[i].adjusted_close),
      ema_200: ind.ema_200 != null ? parseFloat(ind.ema_200) : null,
      ema_20: ind.ema_20 != null ? parseFloat(ind.ema_20) : null,
      ema_50: ind.ema_50 != null ? parseFloat(ind.ema_50) : null,
      vix_close,
      breadth_pct: breadth_by_date.get(d) ?? null,
      persistence_score: computePersistenceScore(persistence_window),
    });
    map.set(d, regime);
  }
  return map;
}

function capSignal(signal) {
  const with_policy = attachExitPolicy(signal);
  if (config.max_sl_distance_pct > 0) {
    return applySlCapToSignal(with_policy, config.max_sl_distance_pct);
  }
  return with_policy;
}

async function runBacktest(train_start, train_end, test_start, test_end) {
  logger.info(`Backtest: train ${train_start}-${train_end}, test ${test_start}-${test_end}`);
  const max_strategy_hold_days = Math.max(
    config.holding_period_days,
    ...Object.values(EXIT_POLICY_PROFILES).map((profile) => profile.max_hold_days || config.holding_period_days)
  );

  const results_by_strategy = {
    TREND_PULLBACK: [],
    BREAKOUT: [],
    RANGE: [],
    MEAN_REVERSION: [],
    TREND_PULLBACK_SHORT: [],
    BREAKDOWN: [],
    COMBINED: [],
  };

  const nifty_candles = await candleModel.findBySymbolAndDateRange(nifty_index_symbol, train_start, test_end);
  const vix_candles = await candleModel.findBySymbolAndDateRange(india_vix_symbol, train_start, test_end);
  const vix_by_date = new Map();
  for (const c of vix_candles) {
    vix_by_date.set(formatDate(c.date), parseFloat(c.close));
  }

  const nifty_indicators_for_regime = nifty_candles.length >= 250
    ? await computeIndicators(nifty_index_symbol, nifty_candles)
    : [];

  let backtest_symbols = nifty_50_symbols;
  const composition_count = await nifty50CompositionModel.count();
  if (composition_count > 0) {
    const historical = await nifty50CompositionModel.getSymbolsForDateRange(test_start, test_end);
    if (historical.length > 0) {
      backtest_symbols = historical;
      logger.info(`Backtest: using historical composition (${historical.length} symbols)`);
    }
  }

  const symbol_contexts = new Map();
  const breadth_accumulator = new Map();
  for (const symbol of backtest_symbols) {
    const all_candles = await candleModel.findBySymbolAndDateRange(symbol, train_start, test_end);
    if (all_candles.length < 250) continue;

    const indicators = await computeIndicators(symbol, all_candles);
    const nifty_aligned = nifty_candles.length >= all_candles.length ? nifty_candles : null;
    const features = await computeFeatures(symbol, all_candles, indicators, nifty_aligned);
    symbol_contexts.set(symbol, { all_candles, indicators, features });

    for (let i = 0; i < features.length; i++) {
      const feature = features[i];
      if (!feature) continue;
      const date_key = feature.date;
      const current = breadth_accumulator.get(date_key) || {
        total: 0,
        uptrend_count: 0,
        rs_positive_count: 0,
        slope_positive_count: 0,
      };
      current.total += 1;
      if (feature.is_uptrend === 1 || feature.is_uptrend === true) current.uptrend_count += 1;
      if (feature.relative_strength_vs_nifty != null && parseFloat(feature.relative_strength_vs_nifty) > 0) current.rs_positive_count += 1;
      if (feature.ema50_slope != null && parseFloat(feature.ema50_slope) > 0) current.slope_positive_count += 1;
      breadth_accumulator.set(date_key, current);
    }
  }

  const breadth_by_date = new Map();
  for (const [date_key, counts] of breadth_accumulator.entries()) {
    if (counts.total <= 0) continue;
    const breadth_pct = (
      (counts.uptrend_count / counts.total)
      + (counts.rs_positive_count / counts.total)
      + (counts.slope_positive_count / counts.total)
    ) * (100 / 3);
    breadth_by_date.set(date_key, breadth_pct);
  }

  const regime_by_date = buildRegimeByDateMap(
    nifty_candles,
    nifty_indicators_for_regime,
    vix_by_date,
    breadth_by_date
  );

  for (const [symbol, context] of symbol_contexts.entries()) {
    const { all_candles, indicators, features } = context;

    for (let i = 0; i < all_candles.length; i++) {
      const candle = all_candles[i];
      const date_str = formatDate(candle.date);

      if (date_str < test_start || date_str > test_end) continue;
      if (!indicators[i] || !features[i]) continue;

      const past_candles = all_candles.slice(Math.max(0, i - 25), i);
      const future_candles = all_candles.slice(i + 1, i + 1 + max_strategy_hold_days);
      if (future_candles.length === 0) continue;

      const regime = regime_by_date.get(date_str) || 'UNKNOWN';
      if (regime === 'HIGH_VOLATILITY' || regime === 'UNKNOWN') {
        continue;
      }

      const long_signals = [];

      if (regime === 'BULLISH' || regime === 'SIDEWAYS') {
        const range_signal = range.evaluate(symbol, date_str, candle, indicators[i], features[i], past_candles);
        if (range_signal) {
          const capped = capSignal(range_signal);
          if (capped) long_signals.push({ name: 'RANGE', signal: capped });
        }

        const reversion_signal = meanReversion.evaluate(symbol, date_str, candle, indicators[i], features[i], past_candles);
        if (reversion_signal) {
          const capped = capSignal(reversion_signal);
          if (capped) long_signals.push({ name: 'MEAN_REVERSION', signal: capped });
        }
      }

      if (regime === 'BULLISH') {
        const trend_signal = trendPullback.evaluate(symbol, date_str, candle, indicators[i], features[i], past_candles);
        if (trend_signal) {
          trend_signal.direction = 'LONG';
          const capped = capSignal(trend_signal);
          if (capped) long_signals.push({ name: 'TREND_PULLBACK', signal: capped });
        }

        const breakout_signal = breakout.evaluate(symbol, date_str, candle, indicators[i], features[i], past_candles);
        if (breakout_signal) {
          breakout_signal.direction = 'LONG';
          const capped = capSignal(breakout_signal);
          if (capped) long_signals.push({ name: 'BREAKOUT', signal: capped });
        }
      }

      if (regime === 'BEARISH') {
        const short_trend = trendPullbackShort.evaluate(symbol, date_str, candle, indicators[i], features[i], past_candles);
        if (short_trend) {
          const sig = capSignal(short_trend);
          if (sig) {
            const outcome = evaluateOutcome(sig, future_candles);
            const net_return = calculateNetReturn(outcome.realistic_entry, outcome.exit_price, 'SHORT');
            results_by_strategy.TREND_PULLBACK_SHORT.push({ ...outcome, net_return, days: outcome.days });
          }
        }

        const breakdown_signal = breakdown.evaluate(symbol, date_str, candle, indicators[i], features[i], past_candles);
        if (breakdown_signal) {
          const sig = capSignal(breakdown_signal);
          if (sig) {
            const outcome = evaluateOutcome(sig, future_candles);
            const net_return = calculateNetReturn(outcome.realistic_entry, outcome.exit_price, 'SHORT');
            results_by_strategy.BREAKDOWN.push({ ...outcome, net_return, days: outcome.days });
          }
        }
      }

      if (long_signals.length > 1) {
        const first = long_signals[0].signal;
        const stop_loss = Math.max(...long_signals.map((s) => s.signal.stop_loss));
        const risk = first.entry_price - stop_loss;
        if (risk > 0) {
          const merged = attachExitPolicy({
            ...first,
            stop_loss,
            target_price: deriveConservativeTarget(long_signals.map((s) => s.signal), 'LONG'),
            exit_policy: {
              kind: 'LEVEL_TARGET',
              target_source: 'MERGED_CONSERVATIVE',
              max_hold_days: Math.max(...long_signals.map((s) => s.signal.max_hold_days || config.holding_period_days)),
            },
            strategy: 'COMBINED',
            direction: 'LONG',
          });
          const outcome = evaluateOutcome(merged, future_candles);
          const net_return = calculateNetReturn(outcome.realistic_entry, outcome.exit_price);
          results_by_strategy.COMBINED.push({ ...outcome, net_return, days: outcome.days });
        }
      } else if (long_signals.length === 1) {
        const { name, signal: sig } = long_signals[0];
        const outcome = evaluateOutcome(sig, future_candles);
        const net_return = calculateNetReturn(outcome.realistic_entry, outcome.exit_price);
        results_by_strategy[name].push({ ...outcome, net_return, days: outcome.days });
      }
    }
  }

  const today = formatDate(new Date());

  for (const [strategy_name, trades] of Object.entries(results_by_strategy)) {
    if (trades.length === 0) {
      logger.info(`Backtest: No ${strategy_name} trades in test period`);
      continue;
    }

    const metrics = calculateMetrics(trades);
    await backtestResultModel.create({
      strategy_name,
      run_date: today,
      train_start,
      train_end,
      test_start,
      test_end,
      ...metrics,
      weight_config: SCORING_WEIGHTS,
    });

    logger.info(`Backtest ${strategy_name}: ${metrics.total_signals} signals, ${metrics.win_rate_pct}% win rate`);
  }

  return results_by_strategy;
}

module.exports = { runBacktest, evaluateOutcome, calculateNetReturn };
