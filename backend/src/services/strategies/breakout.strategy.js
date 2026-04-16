const { logger } = require('../../middlewares/logger.middleware');
const { roundDecimal } = require('../../utils/math.util');

function evaluate(symbol, date, candle, indicator, feature, recent_candles) {
  if (!feature || !indicator || !candle) return null;

  const is_breakout = feature.is_breakout === 1 || feature.is_breakout === true;
  const is_volume_spike = feature.is_volume_spike === 1 || feature.is_volume_spike === true;
  const is_uptrend = feature.is_uptrend === 1 || feature.is_uptrend === true;

  if (!is_breakout) return null;
  if (!is_volume_spike) return null;
  if (!is_uptrend) return null;

  const adjusted_close = parseFloat(candle.adjusted_close);
  const atr = indicator.atr != null ? parseFloat(indicator.atr) : null;
  if (atr == null || atr <= 0) return null;

  const recent_highs = recent_candles.slice(-20).map((c) => parseFloat(c.high));
  if (recent_highs.length === 0) return null;
  const resistance = Math.max(...recent_highs);

  const entry_price = adjusted_close;
  const stop_loss = roundDecimal(resistance - 1.0 * atr, 2);
  const risk = entry_price - stop_loss;

  if (risk <= 0) {
    logger.debug(`Breakout for ${symbol}: SL ${stop_loss} >= entry ${entry_price}, ATR=${atr}`);
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
    strategy: 'BREAKOUT',
    exit_policy: { atr_value: atr },
    reasons: ['Breakout', 'Volume Spike'],
  };
}

module.exports = { evaluate };
