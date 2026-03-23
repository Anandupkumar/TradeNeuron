const { logger } = require('../../middlewares/logger.middleware');
const { roundDecimal } = require('../../utils/math.util');

function evaluate(symbol, date, candle, indicator, feature, recent_candles) {
  if (!feature || !indicator || !candle) return null;

  const z_score = feature.z_score_20d != null ? parseFloat(feature.z_score_20d) : null;
  const rsi_zone = feature.rsi_zone;
  const is_uptrend = feature.is_uptrend === 1 || feature.is_uptrend === true;
  const is_volume_spike = feature.is_volume_spike === 1 || feature.is_volume_spike === true;

  if (z_score == null || z_score >= -2.0) return null;
  if (rsi_zone !== 'OVERSOLD') return null;
  if (!is_uptrend) return null;
  if (is_volume_spike) return null;

  const adjusted_close = parseFloat(candle.adjusted_close);
  const atr = indicator.atr != null ? parseFloat(indicator.atr) : null;
  if (atr == null || atr <= 0) return null;

  const lookback = recent_candles.slice(-20);
  if (lookback.length < 20) return null;

  const closes = lookback.map((c) => parseFloat(c.adjusted_close));
  const mean_20d = closes.reduce((s, v) => s + v, 0) / closes.length;

  const entry_price = adjusted_close;
  const stop_loss = roundDecimal(entry_price - 1.5 * atr, 2);
  const target_price = roundDecimal(mean_20d, 2);
  const risk = entry_price - stop_loss;

  if (risk <= 0) {
    logger.debug(`Mean Reversion for ${symbol}: risk <= 0 (entry=${entry_price}, SL=${stop_loss})`);
    return null;
  }

  const risk_reward = roundDecimal((target_price - entry_price) / risk, 2);

  return {
    symbol,
    date,
    entry_price: roundDecimal(entry_price, 2),
    stop_loss,
    target_price,
    risk_reward,
    strategy: 'MEAN_REVERSION',
    direction: 'LONG',
    reasons: ['Mean Reversion', `Z-Score ${roundDecimal(z_score, 2)}`, 'RSI Oversold'],
  };
}

module.exports = { evaluate };
