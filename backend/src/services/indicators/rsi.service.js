const { RSI } = require('technicalindicators');

function calculateRsi(adjusted_closes, period = 14) {
  if (adjusted_closes.length < period + 1) {
    return new Array(adjusted_closes.length).fill(null);
  }

  const rsi_values = RSI.calculate({ period, values: adjusted_closes });
  const padding = new Array(adjusted_closes.length - rsi_values.length).fill(null);
  return [...padding, ...rsi_values];
}

module.exports = { calculateRsi };
