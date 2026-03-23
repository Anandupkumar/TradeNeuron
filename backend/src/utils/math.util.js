function roundDecimal(value, decimals = 2) {
  if (value == null) return null;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function pctChange(current, previous) {
  if (previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

module.exports = { roundDecimal, pctChange, clamp };
