const trendPullbackShort = require('../../../src/services/strategies/trend_pullback_short.strategy');
const breakdownStrategy = require('../../../src/services/strategies/breakdown.strategy');

describe('Trend Pullback SHORT Strategy', () => {
  const base_candle = { adjusted_close: '800.00' };
  const base_indicator = { ema_20: 830, ema_50: 850, atr: 20 };
  const base_feature = { rsi_zone: 'OVERBOUGHT' };
  const base_recent_candles = Array.from({ length: 20 }, (_, i) => ({
    low: (780 + i).toFixed(2),
    high: (850 + i).toFixed(2),
  }));

  test('should generate SHORT signal when all conditions met', () => {
    const result = trendPullbackShort.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator, base_feature, base_recent_candles
    );

    expect(result).not.toBeNull();
    expect(result.strategy).toBe('TREND_PULLBACK_SHORT');
    expect(result.signal_type).toBe('SELL');
    expect(result.direction).toBe('SHORT');
    expect(result.entry_price).toBe(800);
    expect(result.stop_loss).toBe(879);
    expect(result.target_price).toBe(642);
    expect(result.risk_reward).toBe(2);
    expect(result.reasons).toEqual(['Downtrend', 'RSI Overbought Bounce', 'Short Entry']);
  });

  test('should return null if adjusted_close >= ema_50', () => {
    const result = trendPullbackShort.evaluate(
      'RELIANCE.NS', '2026-03-23', { adjusted_close: '860.00' },
      base_indicator, base_feature, base_recent_candles
    );
    expect(result).toBeNull();
  });

  test('should return null if rsi_zone is not OVERBOUGHT', () => {
    const result = trendPullbackShort.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator,
      { rsi_zone: 'NEUTRAL' }, base_recent_candles
    );
    expect(result).toBeNull();
  });

  test('should return null if ema_20 >= ema_50', () => {
    const result = trendPullbackShort.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle,
      { ...base_indicator, ema_20: 860 }, base_feature, base_recent_candles
    );
    expect(result).toBeNull();
  });

  test('should return null if risk <= 0 (swing_high below entry)', () => {
    const low_high_candles = Array.from({ length: 20 }, () => ({
      low: '780.00',
      high: '795.00',
    }));
    const result = trendPullbackShort.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle,
      { ...base_indicator, atr: 1 }, base_feature, low_high_candles
    );
    expect(result).toBeNull();
  });
});

describe('Breakdown Strategy', () => {
  const base_candle = { adjusted_close: '470.00' };
  const base_indicator = { ema_50: 500, atr: 10 };
  const base_feature = { is_volume_spike: 1 };
  const base_recent_candles = Array.from({ length: 25 }, (_, i) => ({
    low: (480 + i * 0.3).toFixed(2),
    high: (510 + i * 0.3).toFixed(2),
  }));

  test('should generate SHORT signal when all conditions met', () => {
    const result = breakdownStrategy.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator, base_feature, base_recent_candles
    );

    expect(result).not.toBeNull();
    expect(result.strategy).toBe('BREAKDOWN');
    expect(result.signal_type).toBe('SELL');
    expect(result.direction).toBe('SHORT');
    expect(result.entry_price).toBe(470);
    expect(result.stop_loss).toBe(491.5);
    expect(result.target_price).toBe(427);
    expect(result.risk_reward).toBe(2);
    expect(result.reasons).toEqual(['Breakdown Below Support', 'Volume Spike', 'Short Entry']);
  });

  test('should return null if adjusted_close >= support', () => {
    const result = breakdownStrategy.evaluate(
      'RELIANCE.NS', '2026-03-23', { adjusted_close: '490.00' },
      base_indicator, base_feature, base_recent_candles
    );
    expect(result).toBeNull();
  });

  test('should return null if is_volume_spike is false', () => {
    const result = breakdownStrategy.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle, base_indicator,
      { is_volume_spike: 0 }, base_recent_candles
    );
    expect(result).toBeNull();
  });

  test('should return null if adjusted_close >= ema_50', () => {
    const result = breakdownStrategy.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle,
      { ...base_indicator, ema_50: 465 }, base_feature, base_recent_candles
    );
    expect(result).toBeNull();
  });

  test('should return null if atr <= 0', () => {
    const result = breakdownStrategy.evaluate(
      'RELIANCE.NS', '2026-03-23', base_candle,
      { ...base_indicator, atr: 0 }, base_feature, base_recent_candles
    );
    expect(result).toBeNull();
  });
});
