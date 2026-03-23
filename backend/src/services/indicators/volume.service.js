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

module.exports = { calculateVolumeSma20, calculateVolumeChange };
