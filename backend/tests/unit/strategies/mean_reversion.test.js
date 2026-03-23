const meanReversionStrategy = require('../../../src/services/strategies/mean_reversion.strategy');

describe('Mean Reversion Strategy', () => {
  const base_candle = { adjusted_close: '900.00' };
  const base_indicator = { atr: 15 };
  const base_feature = { z_score_20d: -2.5, rsi_zone: 'OVERSOLD', is_uptrend: 1, is_volume_spike: 0 };

  function makeRecentCandles() {
    return Array.from({ length: 25 }, (_, i) => ({
      adjusted_close: (950 + i * 2).toFixed(2),
      low: (940 + i * 2).toFixed(2),
      high: (960 + i * 2).toFixed(2),
    }));
  }

  test('should generate signal when all conditions met', () => {
    const result = meanReversionStrategy.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator, base_feature, makeRecentCandles()
    );

    expect(result).not.toBeNull();
    expect(result.strategy).toBe('MEAN_REVERSION');
    expect(result.direction).toBe('LONG');
    expect(result.entry_price).toBe(900);
    expect(result.stop_loss).toBe(877.5);
    expect(result.target_price).toBe(979);
    expect(result.risk_reward).toBe(3.51);
    expect(result.reasons).toContain('Mean Reversion');
    expect(result.reasons).toContain('RSI Oversold');
  });

  test('should return null if z_score_20d >= -2.0', () => {
    const result = meanReversionStrategy.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator,
      { ...base_feature, z_score_20d: -1.5 }, makeRecentCandles()
    );
    expect(result).toBeNull();
  });

  test('should return null if rsi_zone is not OVERSOLD', () => {
    const result = meanReversionStrategy.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator,
      { ...base_feature, rsi_zone: 'NEUTRAL' }, makeRecentCandles()
    );
    expect(result).toBeNull();
  });

  test('should return null if is_uptrend is false', () => {
    const result = meanReversionStrategy.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator,
      { ...base_feature, is_uptrend: 0 }, makeRecentCandles()
    );
    expect(result).toBeNull();
  });

  test('should return null if is_volume_spike is true (panic selling)', () => {
    const result = meanReversionStrategy.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator,
      { ...base_feature, is_volume_spike: 1 }, makeRecentCandles()
    );
    expect(result).toBeNull();
  });

  test('should return null if fewer than 20 recent candles', () => {
    const short_candles = makeRecentCandles().slice(0, 15);
    const result = meanReversionStrategy.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator, base_feature, short_candles
    );
    expect(result).toBeNull();
  });
});
