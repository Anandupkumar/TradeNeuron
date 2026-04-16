const { logger } = require('../../middlewares/logger.middleware');
const { roundDecimal, pctChange } = require('../../utils/math.util');
const { formatDate } = require('../../utils/date.util');
const { RSI_ZONES } = require('../../config/constants');
const config = require('../../config/env');
const candleModel = require('../../models/candle.model');
const indicatorModel = require('../../models/indicator.model');
const featureModel = require('../../models/feature.model');
const { nifty_index_symbol } = require('../../utils/symbols.util');
const { getThresholds } = require('./adaptive_threshold.service');
const { computeRollingVWAP } = require('../indicators/volume.service');

function classifyRsiZone(rsi, adaptive) {
  if (rsi == null) return 'NEUTRAL';
  if (adaptive) {
    if (rsi < adaptive.rsi_oversold) return 'OVERSOLD';
    if (rsi < adaptive.rsi_pullback) return 'PULLBACK';
    if (rsi < adaptive.rsi_overbought) return 'NEUTRAL';
    return 'OVERBOUGHT';
  }
  if (rsi < RSI_ZONES.OVERSOLD.max) return 'OVERSOLD';
  if (rsi < RSI_ZONES.PULLBACK.max) return 'PULLBACK';
  if (rsi < RSI_ZONES.NEUTRAL.max) return 'NEUTRAL';
  return 'OVERBOUGHT';
}

function isVolumeSpike(volume, volume_sma_20, adaptive) {
  if (adaptive && adaptive.volume_spike_threshold) {
    return volume > adaptive.volume_spike_threshold;
  }
  if (volume_sma_20 == null || volume_sma_20 === 0) return false;
  return volume > 1.5 * volume_sma_20;
}

function isBreakout(adjusted_close, recent_highs) {
  if (recent_highs.length === 0) return false;
  const max_high = Math.max(...recent_highs);
  return adjusted_close > max_high;
}

function isNearSupport(adjusted_close, recent_lows, ema_50) {
  if (recent_lows.length === 0) return false;
  const swing_low = Math.min(...recent_lows);
  const near_swing_low = adjusted_close <= swing_low * 1.01;

  if (ema_50 == null) return near_swing_low;
  const ema_50_distance_pct = Math.abs(adjusted_close - ema_50) / ema_50 * 100;
  return near_swing_low || ema_50_distance_pct <= 2.0;
}

function computeDistanceFrom52wHigh(adjusted_close, high_52w) {
  if (high_52w == null || high_52w === 0) return null;
  return roundDecimal(((high_52w - adjusted_close) / high_52w) * 100, 4);
}

function computeRelativeStrength(stock_change_pct, nifty_change_pct) {
  if (stock_change_pct == null || nifty_change_pct == null) return null;
  return roundDecimal(stock_change_pct - nifty_change_pct, 4);
}

function computeIsRanging(candles, i, atr_values, breakout, rsi_zone) {
  if (i < 20) return false;
  const slice = candles.slice(i - 19, i + 1);
  if (slice.length < 20) return false;

  const highs = slice.map((c) => parseFloat(c.high));
  const lows = slice.map((c) => parseFloat(c.low));
  const price_range_20d = Math.max(...highs) - Math.min(...lows);

  const recent_atrs = atr_values.slice(Math.max(0, i - 19), i + 1).filter((a) => a != null);
  if (recent_atrs.length === 0) return false;
  const atr_20d = recent_atrs.reduce((s, v) => s + v, 0) / recent_atrs.length;
  if (atr_20d === 0) return false;

  const range_to_atr = price_range_20d / (atr_20d * 20);

  return range_to_atr < 1.5
    && !breakout
    && (rsi_zone === 'NEUTRAL' || rsi_zone === 'PULLBACK');
}

function computeZScore(candles, i) {
  if (i < 19) return null;
  const slice = candles.slice(i - 19, i + 1);
  if (slice.length < 20) return null;

  const closes = slice.map((c) => parseFloat(c.adjusted_close));
  const mean = closes.reduce((s, v) => s + v, 0) / closes.length;
  const variance = closes.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / closes.length;
  const stddev = Math.sqrt(variance);

  if (stddev === 0) return 0;
  return roundDecimal((parseFloat(candles[i].adjusted_close) - mean) / stddev, 4);
}

async function computeFeatures(symbol, candles, indicators, nifty_candles) {
  if (!candles || candles.length === 0 || !indicators || indicators.length === 0) {
    return [];
  }

  const high_52w = await candleModel.find52WeekHigh(symbol);

  const atr_values = indicators.map((ind) =>
    ind && ind.atr != null ? parseFloat(ind.atr) : null
  );

  const vwap_data = computeRollingVWAP(candles, 20);

  const features = [];
  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const indicator = indicators[i];
    if (!indicator) continue;

    const adjusted_close = parseFloat(candle.adjusted_close);
    const volume = parseInt(candle.volume, 10);
    const ema_50 = indicator.ema_50 != null ? parseFloat(indicator.ema_50) : null;
    const rsi = indicator.rsi != null ? parseFloat(indicator.rsi) : null;
    const vol_sma_20 = indicator.volume_sma_20 != null ? parseInt(indicator.volume_sma_20, 10) : null;

    let adaptive = null;
    if (config.adaptive_thresholds_enabled) {
      adaptive = await getThresholds(symbol, candle.date);
    }

    const is_uptrend = ema_50 != null && adjusted_close > ema_50;
    const rsi_zone = classifyRsiZone(rsi, adaptive);
    const volume_spike = isVolumeSpike(volume, vol_sma_20, adaptive);

    const start_idx = Math.max(0, i - 20);
    const recent_highs = candles.slice(start_idx, i).map((c) => parseFloat(c.high));
    const breakout = isBreakout(adjusted_close, recent_highs);

    const support_start = Math.max(0, i - 15);
    const recent_lows = candles.slice(support_start, i).map((c) => parseFloat(c.low));
    const near_support = isNearSupport(adjusted_close, recent_lows, ema_50);

    const distance_from_52w_high_pct = computeDistanceFrom52wHigh(adjusted_close, high_52w);

    let relative_strength_vs_nifty = null;
    if (i >= 20 && nifty_candles && nifty_candles.length > i) {
      const stock_change = pctChange(adjusted_close, parseFloat(candles[i - 20].adjusted_close));
      const nifty_change = pctChange(
        parseFloat(nifty_candles[i].adjusted_close),
        parseFloat(nifty_candles[i - 20].adjusted_close)
      );
      relative_strength_vs_nifty = computeRelativeStrength(stock_change, nifty_change);
    }

    const is_liquid = vol_sma_20 != null && vol_sma_20 >= config.min_liquidity_volume;
    const is_ranging = computeIsRanging(candles, i, atr_values, breakout, rsi_zone);
    const z_score_20d = computeZScore(candles, i);

    const candle_high = parseFloat(candle.high);
    const candle_low = parseFloat(candle.low);
    const candle_range = candle_high - candle_low;
    const close_position = candle_range > 0
      ? roundDecimal((adjusted_close - candle_low) / candle_range, 4)
      : null;

    let ema50_slope = null;
    if (i >= 5 && ema_50 != null) {
      const prev_indicator = indicators[i - 5] || null;
      const prev_ema50 = prev_indicator && prev_indicator.ema_50 != null
        ? parseFloat(prev_indicator.ema_50)
        : null;
      if (prev_ema50 != null) {
        ema50_slope = roundDecimal(ema_50 - prev_ema50, 4);
      }
    }

    const delivery_pct = candle.delivery_pct != null ? parseFloat(candle.delivery_pct) : null;
    const is_high_delivery = delivery_pct != null ? delivery_pct > 50 : null;

    const vwma_entry = vwap_data[i];
    const vwma = vwma_entry ? roundDecimal(vwma_entry.vwap, 2) : null;
    const vwma_distance_pct = (vwma != null && vwma > 0)
      ? roundDecimal(((adjusted_close - vwma) / vwma) * 100, 2)
      : null;
    const is_near_vwma = vwma_distance_pct != null ? Math.abs(vwma_distance_pct) < 2.0 : null;

    const rvol = (vol_sma_20 != null && vol_sma_20 > 0)
      ? roundDecimal(volume / vol_sma_20, 2)
      : null;

    let volume_tier = 'normal';
    if (rvol != null) {
      if (rvol >= 3.0) volume_tier = 'extreme';
      else if (rvol >= 2.0) volume_tier = 'high';
      else if (rvol >= 1.3) volume_tier = 'elevated';
    }

    features.push({
      symbol,
      date: formatDate(candle.date),
      is_uptrend,
      rsi_zone,
      is_volume_spike: volume_spike,
      is_breakout: breakout,
      close_position,
      ema50_slope,
      near_support,
      distance_from_52w_high_pct,
      relative_strength_vs_nifty,
      is_liquid,
      is_ranging,
      z_score_20d,
      rvol,
      volume_tier,
      vwma,
      vwma_distance_pct,
      is_near_vwma,
      is_high_delivery,
    });
  }

  return features;
}

async function computeAndStoreFeatures(symbol) {
  const candles = await candleModel.findBySymbolLast(symbol, 300);
  const nifty_candles = await candleModel.findBySymbolLast(nifty_index_symbol, 300);

  if (candles.length === 0) {
    logger.warn(`No candles for feature computation: ${symbol}`);
    return;
  }

  const indicators_rows = await indicatorModel.findBySymbolAndDateRange(
    symbol,
    formatDate(candles[0].date),
    formatDate(candles[candles.length - 1].date)
  );

  const indicator_map = {};
  for (const ind of indicators_rows) {
    indicator_map[formatDate(ind.date)] = ind;
  }

  const aligned_indicators = candles.map((c) => indicator_map[formatDate(c.date)] || null);

  const features = await computeFeatures(symbol, candles, aligned_indicators, nifty_candles);
  if (features.length > 0) {
    await featureModel.bulkUpsert(features);
    logger.info(`Stored ${features.length} features for ${symbol}`);
  }
}

module.exports = {
  computeFeatures,
  computeAndStoreFeatures,
  classifyRsiZone,
  isVolumeSpike,
  isBreakout,
  isNearSupport,
  computeIsRanging,
  computeZScore,
};
