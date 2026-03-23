const breakoutStrategy = require('../../../src/services/strategies/breakout.strategy');

describe('Breakout Strategy', () => {
  const base_candle = { adjusted_close: '1100.00' };
  const base_indicator = { atr: 15 };
  const base_feature = { is_breakout: 1, is_volume_spike: 1, is_uptrend: 1 };

  function makeRecentCandles(high_base = 1050) {
    return Array.from({ length: 25 }, (_, i) => ({
      low: (high_base - 20 + i).toFixed(2),
      high: (high_base + i).toFixed(2),
    }));
  }

  test('should generate signal when all conditions met', () => {
    const result = breakoutStrategy.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator, base_feature, makeRecentCandles()
    );

    expect(result).not.toBeNull();
    expect(result.strategy).toBe('BREAKOUT');
    expect(result.entry_price).toBe(1100);
    expect(result.stop_loss).toBeLessThan(result.entry_price);
  });

  test('should return null if no breakout', () => {
    const result = breakoutStrategy.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator,
      { ...base_feature, is_breakout: 0 }, makeRecentCandles()
    );
    expect(result).toBeNull();
  });

  test('should return null if no volume spike', () => {
    const result = breakoutStrategy.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator,
      { ...base_feature, is_volume_spike: 0 }, makeRecentCandles()
    );
    expect(result).toBeNull();
  });

  test('should return null if not in uptrend', () => {
    const result = breakoutStrategy.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator,
      { ...base_feature, is_uptrend: 0 }, makeRecentCandles()
    );
    expect(result).toBeNull();
  });

  test('should return null if risk <= 0 (ATR pushes SL above entry)', () => {
    // resistance ~ max of recent highs ~ 1074. SL = resistance - 1.0 * atr.
    // Need SL >= entry (1100). So atr must be <= resistance - 1100 = -26 (impossible),
    // OR we make entry < resistance. With entry=1040, resistance=1074, atr=50,
    // SL = 1074 - 50 = 1024. risk = 1040 - 1024 = 16 > 0. Need SL >= entry.
    // entry=1050, resistance=1074, atr=30 → SL=1044, risk=6. Still > 0.
    // Use entry lower than resistance-atr: entry=1020, resistance=1074, atr=60 → SL=1014, risk=6.
    // Actually, set ATR very large: atr=1000, SL = 1074-1000 = 74, risk=1100-74=1026>0. Still works.
    // To get risk<=0 we need SL >= entry. SL = resistance - atr. So atr <= resistance - entry.
    // resistance ~ 1074 (from makeRecentCandles(1050) → 1050+24=1074). atr <= 1074-1100 = -26. Impossible.
    // So we need entry <= resistance AND atr to be small enough. But entry=1100 > resistance=1074 for breakout.
    // For a true breakout scenario where risk<=0: entry price at 1060, resistance=1074, atr=20 → SL=1054, risk=6.
    // The only way is entry < SL. Make resistance small with huge candles that are close:
    // makeRecentCandles(1090) → max high = 1090+24 = 1114. SL = 1114 - 5 = 1109 > entry=1100. risk < 0!
    const result = breakoutStrategy.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle,
      { atr: 5 },
      base_feature, makeRecentCandles(1090)
    );
    expect(result).toBeNull();
  });
});
