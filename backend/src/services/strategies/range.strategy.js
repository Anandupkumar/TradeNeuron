const { logger } = require('../../middlewares/logger.middleware');
const { roundDecimal } = require('../../utils/math.util');

function evaluate(symbol, date, candle, indicator, feature, recent_candles) {
  if (!feature || !indicator || !candle) return null;

  const is_ranging = feature.is_ranging === 1 || feature.is_ranging === true;
  const near_support = feature.near_support === 1 || feature.near_support === true;
  const rsi_zone = feature.rsi_zone;
  const is_breakout = feature.is_breakout === 1 || feature.is_breakout === true;

  if (!is_ranging) return null;
  if (!near_support) return null;
  if (rsi_zone !== 'PULLBACK' && rsi_zone !== 'OVERSOLD') return null;
  if (is_breakout) return null;

  const adjusted_close = parseFloat(candle.adjusted_close);
  const atr = indicator.atr != null ? parseFloat(indicator.atr) : null;
  if (atr == null || atr <= 0) return null;

  const lookback = recent_candles.slice(-20);
  if (lookback.length === 0) return null;

  const support = Math.min(...lookback.map((c) => parseFloat(c.low)));
  const resistance = Math.max(...lookback.map((c) => parseFloat(c.high)));

  const entry_price = adjusted_close;
  const stop_loss = roundDecimal(support - 0.5 * atr, 2);
  const target_price = roundDecimal(resistance * 0.95, 2);
  const risk = entry_price - stop_loss;

  if (risk <= 0) {
    logger.debug(`Range for ${symbol}: risk <= 0 (entry=${entry_price}, SL=${stop_loss})`);
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
    strategy: 'RANGE',
    direction: 'LONG',
    reasons: ['Range Bound', 'Near Support', `RSI ${rsi_zone}`],
  };
}

module.exports = { evaluate };
