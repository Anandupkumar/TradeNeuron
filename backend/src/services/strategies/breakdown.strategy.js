const { logger } = require('../../middlewares/logger.middleware');
const { roundDecimal } = require('../../utils/math.util');

function evaluate(symbol, date, candle, indicator, feature, recent_candles) {
  if (!feature || !indicator || !candle) return null;

  const is_volume_spike = feature.is_volume_spike === 1 || feature.is_volume_spike === true;
  const ema_50 = indicator.ema_50 != null ? parseFloat(indicator.ema_50) : null;
  const adjusted_close = parseFloat(candle.adjusted_close);

  const recent_lows = recent_candles.slice(-20).map((c) => parseFloat(c.low));
  if (recent_lows.length === 0) return null;
  const support = Math.min(...recent_lows);

  if (adjusted_close >= support) return null;
  if (!is_volume_spike) return null;
  if (ema_50 == null || adjusted_close >= ema_50) return null;

  const atr = indicator.atr != null ? parseFloat(indicator.atr) : null;
  if (atr == null || atr <= 0) return null;

  const entry_price = adjusted_close;
  const stop_loss = roundDecimal(support + 1.0 * atr, 2);
  const risk = stop_loss - entry_price;

  if (risk <= 0) {
    logger.debug(`Breakdown SHORT for ${symbol}: risk <= 0 (entry=${entry_price}, SL=${stop_loss})`);
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
    strategy: 'BREAKDOWN',
    signal_type: 'SELL',
    direction: 'SHORT',
    reasons: ['Breakdown Below Support', 'Volume Spike', 'Short Entry'],
  };
}

module.exports = { evaluate };
