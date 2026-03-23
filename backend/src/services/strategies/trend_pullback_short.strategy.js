const { logger } = require('../../middlewares/logger.middleware');
const { roundDecimal } = require('../../utils/math.util');

function evaluate(symbol, date, candle, indicator, feature, recent_candles) {
  if (!feature || !indicator || !candle) return null;

  const rsi_zone = feature.rsi_zone;
  const ema_20 = indicator.ema_20 != null ? parseFloat(indicator.ema_20) : null;
  const ema_50 = indicator.ema_50 != null ? parseFloat(indicator.ema_50) : null;
  const adjusted_close = parseFloat(candle.adjusted_close);

  if (ema_50 == null || adjusted_close >= ema_50) return null;
  if (rsi_zone !== 'OVERBOUGHT') return null;
  if (ema_20 == null || ema_20 >= ema_50) return null;

  const atr = indicator.atr != null ? parseFloat(indicator.atr) : null;
  if (atr == null || atr <= 0) return null;

  const recent_highs = recent_candles.slice(-15).map((c) => parseFloat(c.high));
  if (recent_highs.length === 0) return null;
  const swing_high = Math.max(...recent_highs);

  const entry_price = adjusted_close;
  const stop_loss = roundDecimal(swing_high + 0.5 * atr, 2);
  const risk = stop_loss - entry_price;

  if (risk <= 0) {
    logger.debug(`Trend Pullback SHORT for ${symbol}: risk <= 0 (entry=${entry_price}, SL=${stop_loss})`);
    return null;
  }

  const target_price = roundDecimal(entry_price - 2.0 * risk, 2);
  const risk_reward = roundDecimal((entry_price - target_price) / risk, 2);

  return {
    symbol,
    date,
    entry_price: roundDecimal(entry_price, 2),
    stop_loss,
    target_price,
    risk_reward,
    strategy: 'TREND_PULLBACK_SHORT',
    signal_type: 'SELL',
    direction: 'SHORT',
    reasons: ['Downtrend', 'RSI Overbought Bounce', 'Short Entry'],
  };
}

module.exports = { evaluate };
