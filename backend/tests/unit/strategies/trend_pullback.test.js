const trendPullback = require('../../../src/services/strategies/trend_pullback.strategy');

describe('Trend Pullback Strategy', () => {
  const base_candle = { adjusted_close: '1000.00' };
  const base_indicator = { ema_20: 1010, ema_50: 990, atr: 20 };
  const base_feature = { is_uptrend: 1, rsi_zone: 'PULLBACK', near_support: 1 };

  function makeRecentCandles(low_base = 960) {
    return Array.from({ length: 20 }, (_, i) => ({
      low: (low_base + i).toFixed(2),
      high: (low_base + i + 50).toFixed(2),
    }));
  }

  test('should generate signal when all conditions met', () => {
    const result = trendPullback.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator, base_feature, makeRecentCandles()
    );

    expect(result).not.toBeNull();
    expect(result.strategy).toBe('TREND_PULLBACK');
    expect(result.entry_price).toBe(1000);
    expect(result.stop_loss).toBeLessThan(result.entry_price);
    expect(result.target_price).toBeGreaterThan(result.entry_price);
    expect(result.risk_reward).toBeGreaterThan(0);
  });

  test('should return null if not in uptrend', () => {
    const result = trendPullback.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator,
      { ...base_feature, is_uptrend: 0 }, makeRecentCandles()
    );
    expect(result).toBeNull();
  });

  test('should return null if RSI is not in pullback zone', () => {
    const result = trendPullback.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator,
      { ...base_feature, rsi_zone: 'OVERBOUGHT' }, makeRecentCandles()
    );
    expect(result).toBeNull();
  });

  test('should return null if not near support', () => {
    const result = trendPullback.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator,
      { ...base_feature, near_support: 0 }, makeRecentCandles()
    );
    expect(result).toBeNull();
  });

  test('should return null if EMA20 <= EMA50', () => {
    const result = trendPullback.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle,
      { ...base_indicator, ema_20: 980, ema_50: 990 },
      base_feature, makeRecentCandles()
    );
    expect(result).toBeNull();
  });

  test('should return null if risk <= 0', () => {
    // SL = swing_low - 0.5*atr. With entry=950, swing_low=960, atr=500,
    // SL = 960 - 250 = 710 → risk = 950-710 = 240 > 0.
    // To make risk <= 0, we need SL >= entry. swing_low=960, atr very small,
    // so SL≈960 > entry=950 → risk < 0.
    const result = trendPullback.evaluate(
      'RELIANCE.NS', '2026-03-23', { adjusted_close: '950.00' },
      { ...base_indicator, atr: 0.1 },
      base_feature, makeRecentCandles(960)
    );
    expect(result).toBeNull();
  });
});
