const { logger } = require('../../middlewares/logger.middleware');
const { roundDecimal } = require('../../utils/math.util');
const { formatDate } = require('../../utils/date.util');
const candleModel = require('../../models/candle.model');
const indicatorModel = require('../../models/indicator.model');
const { calculateAllEma } = require('./ema.service');
const { calculateRsi } = require('./rsi.service');
const { calculateMacd } = require('./macd.service');
const { calculateAtr } = require('./atr.service');
const { calculateVolumeSma20, calculateVolumeChange } = require('./volume.service');

async function computeIndicators(symbol, candles) {
  if (!candles || candles.length === 0) {
    logger.warn(`No candles to compute indicators for ${symbol}`);
    return [];
  }

  const adjusted_closes = candles.map((c) => parseFloat(c.adjusted_close));
  const highs = candles.map((c) => parseFloat(c.high));
  const lows = candles.map((c) => parseFloat(c.low));
  const closes = candles.map((c) => parseFloat(c.close));
  const volumes = candles.map((c) => parseInt(c.volume, 10));

  const { ema_20, ema_50, ema_200 } = calculateAllEma(adjusted_closes);
  const rsi = calculateRsi(adjusted_closes);
  const { macd_line, macd_signal, macd_histogram } = calculateMacd(adjusted_closes);
  const atr = calculateAtr(highs, lows, closes);
  const volume_sma_20 = calculateVolumeSma20(volumes);
  const volume_change = calculateVolumeChange(volumes, volume_sma_20);

  const indicators = candles.map((candle, i) => ({
    symbol,
    date: formatDate(candle.date),
    ema_20: roundDecimal(ema_20[i], 2),
    ema_50: roundDecimal(ema_50[i], 2),
    ema_200: roundDecimal(ema_200[i], 2),
    rsi: roundDecimal(rsi[i], 4),
    macd_line: roundDecimal(macd_line[i], 4),
    macd_signal: roundDecimal(macd_signal[i], 4),
    macd_histogram: roundDecimal(macd_histogram[i], 4),
    atr: roundDecimal(atr[i], 4),
    volume_sma_20: volume_sma_20[i],
    volume_change: roundDecimal(volume_change[i], 4),
  }));

  return indicators;
}

async function computeAndStoreIndicators(symbol) {
  const candles = await candleModel.findBySymbolLast(symbol, 300);
  if (candles.length === 0) {
    logger.warn(`No candles found for indicator computation: ${symbol}`);
    return;
  }

  const indicators = await computeIndicators(symbol, candles);
  if (indicators.length > 0) {
    await indicatorModel.bulkUpsert(indicators);
    logger.info(`Stored ${indicators.length} indicators for ${symbol}`);
  }
}

module.exports = { computeIndicators, computeAndStoreIndicators };
