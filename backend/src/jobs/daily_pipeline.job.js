const { logger } = require('../middlewares/logger.middleware');
const { formatDate } = require('../utils/date.util');
const { nifty_50_symbols, nifty_index_symbol, india_vix_symbol } = require('../utils/symbols.util');
const { fetchYahooCandles, probeYahooApi } = require('../services/data_ingestion/yahoo.service');
const { validateData, checkCandleSourceQuality } = require('../services/data_ingestion/validation.service');
const { computeAndStoreIndicators } = require('../services/indicators/index');
const { computeAndStoreFeatures } = require('../services/features/feature.service');
const { computeAndStoreThresholds } = require('../services/features/adaptive_threshold.service');
const { checkMarketRegime, runStrategies } = require('../services/strategies/index');
const { filterByFundamentals } = require('../services/fundamentals/fundamental.filter');
const { filterBySentiment } = require('../services/sentiment/sentiment.service');
const { fetchBhavcopy } = require('../services/data_ingestion/bhavcopy.service');
const { fetchPCR } = require('../services/data_ingestion/fno.service');
const { deduplicateAndGenerate, updateSignalStatuses } = require('../services/signals/signal.service');
const { createPaperTrades, updatePaperTrades } = require('../services/paper_trading/paper_trade.service');
const candleModel = require('../models/candle.model');
const signalModel = require('../models/signal.model');
const config = require('../config/env');
const { sendTelegramAlert } = require('../utils/notify.util');

const ALL_FETCH_SYMBOLS = [...nifty_50_symbols, nifty_index_symbol, india_vix_symbol];
const INDICATOR_SYMBOLS = [...nifty_50_symbols, nifty_index_symbol];

async function runDailyPipeline() {
  const start_time = Date.now();
  const today = formatDate(new Date());
  logger.info(`=== Daily Pipeline Start: ${today} (13 steps) ===`);

  try {
    // Step 1: Fetch candles (skip if Yahoo API is unreachable)
    logger.info('Step 1/13: Fetching candles for all symbols');
    const yahoo_available = await probeYahooApi();
    if (!yahoo_available) {
      logger.warn('Step 1: Yahoo API is unreachable or rate-limited — skipping live fetch, using existing data');
    }

    if (yahoo_available) {
      for (const symbol of ALL_FETCH_SYMBOLS) {
        try {
          const latest = await candleModel.findLatestBySymbol(symbol);
          const start_date = latest
            ? formatDate(new Date(new Date(latest.date).getTime() + 86400000))
            : formatDate(new Date(Date.now() - 7 * 86400000));

          const candles = await fetchYahooCandles(symbol, start_date, today);
          if (candles.length > 0) {
            await candleModel.bulkUpsert(candles);
          }
        } catch (error) {
          logger.error(`Step 1 failed for ${symbol}: ${error.message}`);
        }
      }
    }

    // Step 1b: Fetch NSE Bhavcopy for delivery percentage (fail-open)
    try {
      const bhavcopy_candles = await fetchBhavcopy(today);
      if (bhavcopy_candles.length > 0) {
        await candleModel.bulkUpsert(bhavcopy_candles);
        logger.info(`Step 1b: Bhavcopy enriched ${bhavcopy_candles.length} candles with delivery data`);
      }
    } catch (error) {
      logger.warn(`Step 1b: Bhavcopy fetch skipped — ${error.message}`);
    }

    // Step 1c: Fetch NIFTY PCR from NSE option chain (fail-open)
    let nifty_pcr = null;
    try {
      nifty_pcr = await fetchPCR('NIFTY');
    } catch (error) {
      logger.warn(`Step 1c: PCR fetch skipped — ${error.message}`);
    }

    // Determine the latest available data date (may differ from today if live fetch was skipped)
    const ref_candle = await candleModel.findLatestBySymbol(nifty_50_symbols[0]);
    const data_date = ref_candle ? formatDate(ref_candle.date) : today;
    if (data_date !== today) {
      logger.info(`Using latest data date: ${data_date} (today: ${today})`);
    }

    // Step 2: Validate data
    logger.info('Step 2/13: Validating data');
    for (const symbol of nifty_50_symbols) {
      try {
        const seven_days_ago = formatDate(new Date(Date.now() - 7 * 86400000));
        await validateData(symbol, seven_days_ago, data_date);
      } catch (error) {
        logger.error(`Step 2 failed for ${symbol}: ${error.message}`);
      }
    }

    // Step 2b: Check candle data source quality
    logger.info('Step 2b/13: Checking candle data source quality');
    let suspect_symbols = new Set();
    try {
      const quality = await checkCandleSourceQuality(data_date);
      logger.info(`Step 2b: Quality=${quality.quality}, Yahoo=${quality.yahoo_count}, Bhavcopy=${quality.bhavcopy_count}`);

      if (quality.quality === 'POOR') {
        const msg =
          `Data quality POOR: ${quality.bhavcopy_count}/${quality.total_symbols} symbols ` +
          `from Bhavcopy (unadjusted close). EMA/RSI calculations unreliable. ` +
          `Affected: ${quality.bhavcopy_symbols.join(', ')}`;
        logger.warn(msg);
        await sendTelegramAlert(`⚠️ TradeNeuron: ${msg}`);
      }

      if (quality.suspicious_gap_symbols.length > 0) {
        logger.warn(`Suspicious adjusted_close gap on: ${quality.suspicious_gap_symbols.join(', ')}`);
      }

      suspect_symbols = new Set(quality.suspect_symbols);
    } catch (error) {
      logger.warn(`Step 2b: Quality check failed — ${error.message}. Proceeding without exclusions.`);
    }

    // Step 3: Compute indicators
    logger.info('Step 3/13: Computing indicators');
    for (const symbol of INDICATOR_SYMBOLS) {
      if (suspect_symbols.has(symbol)) {
        logger.warn(`Step 3: Skipping indicator computation for ${symbol} (suspect candle data)`);
        continue;
      }
      try {
        await computeAndStoreIndicators(symbol);
      } catch (error) {
        logger.error(`Step 3 failed for ${symbol}: ${error.message}`);
      }
    }

    // Step 4: Compute features (including is_ranging, z_score_20d)
    logger.info('Step 4/13: Computing features');
    for (const symbol of nifty_50_symbols) {
      if (suspect_symbols.has(symbol)) {
        logger.warn(`Step 4: Skipping feature extraction for ${symbol} (suspect candle data)`);
        continue;
      }
      try {
        await computeAndStoreFeatures(symbol);
      } catch (error) {
        logger.error(`Step 4 failed for ${symbol}: ${error.message}`);
      }
    }

    // Step 5: Compute adaptive thresholds
    logger.info('Step 5/13: Computing adaptive thresholds');
    if (config.adaptive_thresholds_enabled) {
      const threshold_symbols = [...nifty_50_symbols, india_vix_symbol];
      for (const symbol of threshold_symbols) {
        try {
          await computeAndStoreThresholds(symbol, new Date());
        } catch (error) {
          logger.error(`Step 5 failed for ${symbol}: ${error.message}`);
        }
      }
    } else {
      logger.info('Step 5: Adaptive thresholds disabled, skipping');
    }

    // Step 6: Check market regime
    logger.info('Step 6/13: Checking market regime');
    const { regime, reason } = await checkMarketRegime();
    logger.info(`Market regime: ${regime}${reason ? ` (${reason})` : ''}`);

    if (regime === 'HIGH_VOLATILITY' || regime === 'UNKNOWN') {
      logger.info(`${regime} regime -- skipping to Step 12 (status updates)`);

      logger.info('Step 12/13: Updating signal statuses');
      await updateSignalStatuses();

      logger.info('Step 13/13: Updating paper trades');
      await updatePaperTrades();

      const elapsed = Date.now() - start_time;
      logger.info(`=== Daily Pipeline Complete: ${elapsed}ms (skipped signal generation) ===`);
      await sendTelegramAlert(
        `⚠️ <b>TradeNeuron pipeline</b>\n${regime} regime — skipped signal generation.\nDuration: ${(elapsed / 1000).toFixed(1)}s`
      );
      return;
    }

    // Step 7: Run strategies (regime-gated)
    logger.info(`Step 7/13: Running strategies (regime=${regime})`);
    const raw_signal_map = {};
    for (const symbol of nifty_50_symbols) {
      if (suspect_symbols.has(symbol)) continue;
      try {
        const signals = await runStrategies(symbol, data_date, regime);
        if (signals.length > 0) {
          raw_signal_map[symbol] = signals;
        }
      } catch (error) {
        logger.error(`Step 7 failed for ${symbol}: ${error.message}`);
      }
    }
    logger.info(`Step 7: ${Object.keys(raw_signal_map).length} symbols with raw signals`);

    // Step 8: Fundamental filter
    logger.info('Step 8/13: Applying fundamental filter');
    const post_fundamental = await filterByFundamentals(raw_signal_map);
    logger.info(`Step 8: ${Object.keys(post_fundamental).length} symbols passed fundamental filter`);

    // Step 9: Sentiment filter (negation-aware + optional Finnhub)
    logger.info('Step 9/13: Applying sentiment filter');
    const post_sentiment = await filterBySentiment(post_fundamental);
    logger.info(`Step 9: ${Object.keys(post_sentiment).length} symbols passed sentiment filter`);

    // Step 10: Score, deduplicate, position sizing, and generate signals
    logger.info('Step 10/13: Scoring, deduplicating, and generating signals');
    const new_signals = [];
    for (const [symbol, raw_signals] of Object.entries(post_sentiment)) {
      try {
        const long_signals = raw_signals.filter((s) => (s.direction || 'LONG') === 'LONG');
        const short_signals = raw_signals.filter((s) => s.direction === 'SHORT');

        if (long_signals.length > 0) {
          const signal = await deduplicateAndGenerate(symbol, data_date, long_signals, new_signals, nifty_pcr);
          if (signal) new_signals.push(signal);
        }
        if (short_signals.length > 0) {
          const signal = await deduplicateAndGenerate(symbol, data_date, short_signals, new_signals, nifty_pcr);
          if (signal) new_signals.push(signal);
        }
      } catch (error) {
        logger.error(`Step 10 failed for ${symbol}: ${error.message}`);
      }
    }
    logger.info(`Step 10: ${new_signals.length} signals generated`);

    // Step 11: Store signals + create paper trades
    logger.info('Step 11/13: Storing signals and creating paper trades');
    const stored_signals = [];
    for (const signal of new_signals) {
      try {
        const created = await signalModel.create(signal);
        stored_signals.push(created);
      } catch (error) {
        logger.error(`Step 11 store failed for ${signal.symbol}: ${error.message}`);
      }
    }

    if (stored_signals.length > 0) {
      await createPaperTrades(stored_signals);
    }
    logger.info(`Step 11: ${stored_signals.length} signals stored, paper trades created`);

    // Step 12: Update signal statuses
    logger.info('Step 12/13: Updating signal statuses');
    await updateSignalStatuses();

    // Step 13: Update paper trades
    logger.info('Step 13/13: Updating paper trades');
    await updatePaperTrades();

    const elapsed = Date.now() - start_time;
    logger.info(`=== Daily Pipeline Complete: ${elapsed}ms ===`);

    if (new_signals.length === 0 && regime !== 'HIGH_VOLATILITY') {
      await sendTelegramAlert(
        `⚠️ <b>TradeNeuron pipeline</b>\nPipeline ran but generated 0 signals.\nRegime: ${regime}\nDuration: ${(elapsed / 1000).toFixed(1)}s`
      );
    } else {
      await sendTelegramAlert(
        `✅ <b>TradeNeuron pipeline complete</b>\nSignals generated: ${new_signals.length}\nMarket regime: ${regime}\nDuration: ${(elapsed / 1000).toFixed(1)}s`
      );
    }
  } catch (error) {
    logger.error(`Pipeline fatal error: ${error.message}`, { stack: error.stack });
    await sendTelegramAlert(
      `❌ <b>TradeNeuron pipeline FAILED</b>\nError: ${error.message}`
    );
    throw error;
  }
}

module.exports = { runDailyPipeline };
