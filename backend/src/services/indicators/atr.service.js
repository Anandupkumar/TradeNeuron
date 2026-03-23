const { ATR } = require('technicalindicators');

function calculateAtr(highs, lows, closes, period = 14) {
  if (highs.length < period + 1) {
    return new Array(highs.length).fill(null);
  }

  const atr_values = ATR.calculate({
    period,
    high: highs,
    low: lows,
    close: closes,
  });

  const padding = new Array(highs.length - atr_values.length).fill(null);
  return [...padding, ...atr_values];
}

module.exports = { calculateAtr };
