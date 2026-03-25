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
const { SCORING_WEIGHTS } = require('../../config/constants');
const { calculateMetrics } = require('./metrics.service');
const backtestResultModel = require('../../models/backtest_result.model');
const { nifty_50_symbols, nifty_index_symbol } = require('../../utils/symbols.util');
const nifty50CompositionModel = require('../../models/nifty50_composition.model');

function evaluateOutcome(signal, future_candles) {
  if (future_candles.length === 0) {
    return { result: 'NEUTRAL', exit_price: signal.entry_price, realistic_entry: signal.entry_price, days: 0 };
  }

  const is_short = signal.direction === 'SHORT';
  const realistic_entry = parseFloat(future_candles[0].open);

  // Gap-open guard: next-day open already past SL means immediate loss
  if (is_short && realistic_entry >= signal.stop_loss) {
    return { result: 'LOSS', exit_price: realistic_entry, realistic_entry, days: 0, gap_open: true };
  }
  if (!is_short && realistic_entry <= signal.stop_loss) {
    return { result: 'LOSS', exit_price: realistic_entry, realistic_entry, days: 0, gap_open: true };
  }

  for (let day = 0; day < Math.min(future_candles.length, config.holding_period_days); day++) {
    const candle = future_candles[day];
    const low = parseFloat(candle.low);
    const high = parseFloat(candle.high);

    if (is_short) {
      if (high >= signal.stop_loss) {
        return { result: 'LOSS', exit_price: signal.stop_loss, realistic_entry, days: day + 1 };
      }
      if (low <= signal.target_price) {
        return { result: 'WIN', exit_price: signal.target_price, realistic_entry, days: day + 1 };
      }
    } else {
      if (low <= signal.stop_loss) {
        return { result: 'LOSS', exit_price: signal.stop_loss, realistic_entry, days: day + 1 };
      }
      if (high >= signal.target_price) {
        return { result: 'WIN', exit_price: signal.target_price, realistic_entry, days: day + 1 };
      }
    }
  }

  const last_candle = future_candles[future_candles.length - 1];
  const exit_price = last_candle ? parseFloat(last_candle.adjusted_close) : realistic_entry;
  return { result: 'NEUTRAL', exit_price, realistic_entry, days: future_candles.length };
}

function calculateNetReturn(entry_price, exit_price) {
  const slippage = config.slippage_pct / 100;
  const brokerage = config.brokerage_pct / 100;
  const effective_entry = entry_price * (1 + slippage + brokerage);
  const effective_exit = exit_price * (1 - slippage - brokerage);
  return ((effective_exit - effective_entry) / effective_entry) * 100;
}

async function runBacktest(train_start, train_end, test_start, test_end) {
  logger.info(`Backtest: train ${train_start}-${train_end}, test ${test_start}-${test_end}`);

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

  let backtest_symbols = nifty_50_symbols;
  const composition_count = await nifty50CompositionModel.count();
  if (composition_count > 0) {
    const historical = await nifty50CompositionModel.getSymbolsForDateRange(test_start, test_end);
    if (historical.length > 0) {
      backtest_symbols = historical;
      logger.info(`Backtest: using historical composition (${historical.length} symbols)`);
    }
  }

  for (const symbol of backtest_symbols) {
    const all_candles = await candleModel.findBySymbolAndDateRange(symbol, train_start, test_end);
    if (all_candles.length < 250) continue;

    const indicators = await computeIndicators(symbol, all_candles);
    const nifty_aligned = nifty_candles.length >= all_candles.length ? nifty_candles : null;
    const features = await computeFeatures(symbol, all_candles, indicators, nifty_aligned);

    for (let i = 0; i < all_candles.length; i++) {
      const candle = all_candles[i];
      const date_str = formatDate(candle.date);

      if (date_str < test_start || date_str > test_end) continue;
      if (!indicators[i] || !features[i]) continue;

      const past_candles = all_candles.slice(Math.max(0, i - 25), i);
      const future_candles = all_candles.slice(i + 1, i + 1 + config.holding_period_days);
      if (future_candles.length === 0) continue;

      const long_signals = [];

      const trend_signal = trendPullback.evaluate(symbol, date_str, candle, indicators[i], features[i], past_candles);
      if (trend_signal) {
        trend_signal.direction = 'LONG';
        long_signals.push({ name: 'TREND_PULLBACK', signal: trend_signal });
      }

      const breakout_signal = breakout.evaluate(symbol, date_str, candle, indicators[i], features[i], past_candles);
      if (breakout_signal) {
        breakout_signal.direction = 'LONG';
        long_signals.push({ name: 'BREAKOUT', signal: breakout_signal });
      }

      const range_signal = range.evaluate(symbol, date_str, candle, indicators[i], features[i], past_candles);
      if (range_signal) {
        long_signals.push({ name: 'RANGE', signal: range_signal });
      }

      const reversion_signal = meanReversion.evaluate(symbol, date_str, candle, indicators[i], features[i], past_candles);
      if (reversion_signal) {
        long_signals.push({ name: 'MEAN_REVERSION', signal: reversion_signal });
      }

      const short_trend = trendPullbackShort.evaluate(symbol, date_str, candle, indicators[i], features[i], past_candles);
      if (short_trend) {
        const outcome = evaluateOutcome(short_trend, future_candles);
        const net_return = calculateNetReturn(outcome.realistic_entry, outcome.exit_price);
        results_by_strategy.TREND_PULLBACK_SHORT.push({ ...outcome, net_return, days: outcome.days });
      }

      const breakdown_signal = breakdown.evaluate(symbol, date_str, candle, indicators[i], features[i], past_candles);
      if (breakdown_signal) {
        const outcome = evaluateOutcome(breakdown_signal, future_candles);
        const net_return = calculateNetReturn(outcome.realistic_entry, outcome.exit_price);
        results_by_strategy.BREAKDOWN.push({ ...outcome, net_return, days: outcome.days });
      }

      if (long_signals.length > 1) {
        const first = long_signals[0].signal;
        const stop_loss = Math.max(...long_signals.map((s) => s.signal.stop_loss));
        const risk = first.entry_price - stop_loss;
        if (risk > 0) {
          const merged = {
            ...first,
            stop_loss,
            target_price: roundDecimal(first.entry_price + 2.0 * risk, 2),
            strategy: 'COMBINED',
            direction: 'LONG',
          };
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
