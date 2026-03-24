function calculateVolumeSma20(volumes) {
  const period = 20;
  const result = new Array(volumes.length).fill(null);

  for (let i = period - 1; i < volumes.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += volumes[j];
    }
    result[i] = Math.round(sum / period);
  }

  return result;
}

function calculateVolumeChange(volumes, volume_sma_20s) {
  return volumes.map((vol, i) => {
    const sma = volume_sma_20s[i];
    if (sma == null || sma === 0) return null;
    return (vol - sma) / sma;
  });
}

function computeRollingVWAP(candles, period = 20) {
  return candles.map((c, i) => {
    const start = Math.max(0, i - period + 1);
    const window = candles.slice(start, i + 1);
    let sum_tpv = 0;
    let sum_vol = 0;
    for (const x of window) {
      const h = parseFloat(x.high);
      const l = parseFloat(x.low);
      const cl = parseFloat(x.close);
      const v = parseInt(x.volume, 10) || 0;
      sum_tpv += ((h + l + cl) / 3) * v;
      sum_vol += v;
    }
    return { date: c.date, vwap: sum_vol > 0 ? sum_tpv / sum_vol : parseFloat(c.close) };
  });
}

module.exports = { calculateVolumeSma20, calculateVolumeChange, computeRollingVWAP };
