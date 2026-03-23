const { MACD } = require('technicalindicators');

function calculateMacd(adjusted_closes) {
  const min_required = 26 + 9;
  if (adjusted_closes.length < min_required) {
    return {
      macd_line: new Array(adjusted_closes.length).fill(null),
      macd_signal: new Array(adjusted_closes.length).fill(null),
      macd_histogram: new Array(adjusted_closes.length).fill(null),
    };
  }

  const macd_values = MACD.calculate({
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
    values: adjusted_closes,
  });

  const padding_length = adjusted_closes.length - macd_values.length;
  const pad = (arr) => [...new Array(padding_length).fill(null), ...arr];

  return {
    macd_line: pad(macd_values.map((v) => v.MACD ?? null)),
    macd_signal: pad(macd_values.map((v) => v.signal ?? null)),
    macd_histogram: pad(macd_values.map((v) => v.histogram ?? null)),
  };
}

module.exports = { calculateMacd };
