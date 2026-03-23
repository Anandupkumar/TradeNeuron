function generateCandles(symbol, count = 300, base_price = 1000) {
  const candles = [];
  let price = base_price;

  for (let i = 0; i < count; i++) {
    const date = new Date('2025-01-01');
    date.setDate(date.getDate() + i);

    const change = (Math.random() - 0.48) * 20;
    price = Math.max(price + change, 50);

    const open = price;
    const close = price + (Math.random() - 0.5) * 10;
    const high = Math.max(open, close) + Math.random() * 5;
    const low = Math.min(open, close) - Math.random() * 5;

    candles.push({
      symbol,
      date: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      adjusted_close: parseFloat(close.toFixed(2)),
      volume: Math.floor(1000000 + Math.random() * 9000000),
      source: 'YAHOO',
    });
  }

  return candles;
}

function generateUptrendCandles(symbol, count = 300, base_price = 1000) {
  const candles = [];
  let price = base_price;

  for (let i = 0; i < count; i++) {
    const date = new Date('2025-01-01');
    date.setDate(date.getDate() + i);

    const change = (Math.random() * 3) + 0.5;
    price += change;

    const open = price - 1;
    const close = price;
    const high = price + Math.random() * 3;
    const low = price - Math.random() * 3 - 1;

    candles.push({
      symbol,
      date: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(Math.max(low, 10).toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      adjusted_close: parseFloat(close.toFixed(2)),
      volume: Math.floor(1000000 + Math.random() * 9000000),
      source: 'YAHOO',
    });
  }

  return candles;
}

module.exports = { generateCandles, generateUptrendCandles };
