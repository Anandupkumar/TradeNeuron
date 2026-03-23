const { logger } = require('../../middlewares/logger.middleware');
const { roundDecimal } = require('../../utils/math.util');

function evaluate(symbol, date, candle, indicator, feature, recent_candles) {
  if (!feature || !indicator || !candle) return null;

  const is_uptrend = feature.is_uptrend === 1 || feature.is_uptrend === true;
  const rsi_zone = feature.rsi_zone;
  const near_support = feature.near_support === 1 || feature.near_support === true;
  const ema_20 = indicator.ema_20 != null ? parseFloat(indicator.ema_20) : null;
  const ema_50 = indicator.ema_50 != null ? parseFloat(indicator.ema_50) : null;

  if (!is_uptrend) return null;
  if (rsi_zone !== 'PULLBACK') return null;
  if (!near_support) return null;
  if (ema_20 == null || ema_50 == null || ema_20 <= ema_50) return null;

  const adjusted_close = parseFloat(candle.adjusted_close);
  const atr = indicator.atr != null ? parseFloat(indicator.atr) : null;
  if (atr == null || atr <= 0) return null;

  const recent_lows = recent_candles.slice(-15).map((c) => parseFloat(c.low));
  if (recent_lows.length === 0) return null;
  const swing_low = Math.min(...recent_lows);

  const entry_price = adjusted_close;
  const stop_loss = roundDecimal(swing_low - 0.5 * atr, 2);
  const risk = entry_price - stop_loss;

  if (risk <= 0) {
    logger.debug(`Trend Pullback for ${symbol}: risk <= 0 (entry=${entry_price}, SL=${stop_loss})`);
    return null;
  }

  const target_price = roundDecimal(entry_price + 2.0 * risk, 2);
  const risk_reward = roundDecimal((target_price - entry_price) / risk, 2);

  return {
    symbol,
    date,
    entry_price: roundDecimal(entry_price, 2),
    stop_loss,
    target_price,
    risk_reward,
    strategy: 'TREND_PULLBACK',
    reasons: ['Trend Alignment', 'RSI Pullback', 'Near Support'],
  };
}

module.exports = { evaluate };
