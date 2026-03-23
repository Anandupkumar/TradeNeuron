const { logger } = require('../../middlewares/logger.middleware');
const { roundDecimal } = require('../../utils/math.util');
const { formatDate } = require('../../utils/date.util');
const config = require('../../config/env');
const candleModel = require('../../models/candle.model');
const indicatorModel = require('../../models/indicator.model');
const adaptiveThresholdModel = require('../../models/adaptive_threshold.model');
const { india_vix_symbol } = require('../../utils/symbols.util');

function percentile(sorted_arr, p) {
  if (sorted_arr.length === 0) return null;
  const idx = (p / 100) * (sorted_arr.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted_arr[lower];
  return sorted_arr[lower] + (sorted_arr[upper] - sorted_arr[lower]) * (idx - lower);
}

async function computeVixThreshold() {
  const vix_candles = await candleModel.findBySymbolLast(india_vix_symbol, 252);
  if (vix_candles.length < config.adaptive_min_data_points) {
    return null;
  }
  const closes = vix_candles.map((c) => parseFloat(c.close)).sort((a, b) => a - b);
  return roundDecimal(percentile(closes, 75), 4);
}

async function computeVolumeThreshold(symbol) {
  const candles = await candleModel.findBySymbolLast(symbol, 60);
  if (candles.length < config.adaptive_min_data_points) {
    return null;
  }
  const volumes = candles.map((c) => parseInt(c.volume, 10)).sort((a, b) => a - b);
  return Math.round(percentile(volumes, 80));
}

async function computeRsiThresholds(symbol) {
  const indicators = await indicatorModel.findBySymbolLast(symbol, 60);
  const rsi_values = indicators
    .filter((ind) => ind.rsi != null)
    .map((ind) => parseFloat(ind.rsi))
    .sort((a, b) => a - b);

  if (rsi_values.length < config.adaptive_min_data_points) {
    return null;
  }

  return {
    rsi_oversold: roundDecimal(percentile(rsi_values, 25), 4),
    rsi_pullback: roundDecimal(percentile(rsi_values, 45), 4),
    rsi_overbought: roundDecimal(percentile(rsi_values, 70), 4),
  };
}

async function computeAndStoreThresholds(symbol, date) {
  if (!config.adaptive_thresholds_enabled) return null;

  const vix_threshold = await computeVixThreshold();
  const volume_spike_threshold = await computeVolumeThreshold(symbol);
  const rsi_thresholds = await computeRsiThresholds(symbol);

  const threshold = {
    symbol,
    date: formatDate(date),
    vix_threshold,
    volume_spike_threshold,
    rsi_oversold: rsi_thresholds ? rsi_thresholds.rsi_oversold : null,
    rsi_pullback: rsi_thresholds ? rsi_thresholds.rsi_pullback : null,
    rsi_overbought: rsi_thresholds ? rsi_thresholds.rsi_overbought : null,
  };

  await adaptiveThresholdModel.upsert(threshold);
  return threshold;
}

async function getThresholds(symbol, date) {
  if (!config.adaptive_thresholds_enabled) return null;
  return adaptiveThresholdModel.findBySymbolAndDate(symbol, formatDate(date));
}

module.exports = {
  computeAndStoreThresholds,
  getThresholds,
  percentile,
  computeVixThreshold,
  computeVolumeThreshold,
  computeRsiThresholds,
};
