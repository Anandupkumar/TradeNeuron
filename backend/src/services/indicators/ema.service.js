const { EMA } = require('technicalindicators');

function calculateEma(adjusted_closes, period) {
  if (adjusted_closes.length < period) {
    return new Array(adjusted_closes.length).fill(null);
  }

  const ema_values = EMA.calculate({ period, values: adjusted_closes });
  const padding = new Array(adjusted_closes.length - ema_values.length).fill(null);
  return [...padding, ...ema_values];
}

function calculateAllEma(adjusted_closes) {
  return {
    ema_20: calculateEma(adjusted_closes, 20),
    ema_50: calculateEma(adjusted_closes, 50),
    ema_200: calculateEma(adjusted_closes, 200),
  };
}

module.exports = { calculateEma, calculateAllEma };
