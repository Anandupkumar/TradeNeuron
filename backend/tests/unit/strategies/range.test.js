const rangeStrategy = require('../../../src/services/strategies/range.strategy');

describe('Range Strategy', () => {
  const base_candle = { adjusted_close: '500.00' };
  const base_indicator = { atr: 10 };
  const base_feature = { is_ranging: 1, near_support: 1, rsi_zone: 'PULLBACK', is_breakout: 0 };

  function makeRecentCandles() {
    return Array.from({ length: 25 }, (_, i) => ({
      low: (480 + i * 0.5).toFixed(2),
      high: (530 + i * 0.5).toFixed(2),
    }));
  }

  test('should generate signal when all conditions met', () => {
    const result = rangeStrategy.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator, base_feature, makeRecentCandles()
    );

    expect(result).not.toBeNull();
    expect(result.strategy).toBe('RANGE');
    expect(result.direction).toBe('LONG');
    expect(result.entry_price).toBe(500);
    expect(result.stop_loss).toBe(477.5);
    expect(result.target_price).toBe(514.9);
    expect(result.risk_reward).toBe(0.66);
    expect(result.reasons).toEqual(['Range Bound', 'Near Support', 'RSI PULLBACK']);
  });

  test('should return null if is_ranging is false', () => {
    const result = rangeStrategy.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator,
      { ...base_feature, is_ranging: 0 }, makeRecentCandles()
    );
    expect(result).toBeNull();
  });

  test('should return null if near_support is false', () => {
    const result = rangeStrategy.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator,
      { ...base_feature, near_support: 0 }, makeRecentCandles()
    );
    expect(result).toBeNull();
  });

  test('should return null if rsi_zone is OVERBOUGHT', () => {
    const result = rangeStrategy.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator,
      { ...base_feature, rsi_zone: 'OVERBOUGHT' }, makeRecentCandles()
    );
    expect(result).toBeNull();
  });

  test('should return null if is_breakout is true (range broken)', () => {
    const result = rangeStrategy.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator,
      { ...base_feature, is_breakout: 1 }, makeRecentCandles()
    );
    expect(result).toBeNull();
  });

  test('should return null if risk <= 0', () => {
    const result = rangeStrategy.evaluate(
      'RELIANCE.NS', '2026-03-23', { adjusted_close: '480.00' },
      { atr: 1 }, base_feature, makeRecentCandles()
    );
    expect(result).toBeNull();
  });

  test('should accept OVERSOLD rsi_zone as valid', () => {
    const result = rangeStrategy.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator,
      { ...base_feature, rsi_zone: 'OVERSOLD' }, makeRecentCandles()
    );
    expect(result).not.toBeNull();
    expect(result.reasons).toContain('RSI OVERSOLD');
  });
});
