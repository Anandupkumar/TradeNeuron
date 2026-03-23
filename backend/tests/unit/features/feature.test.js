const {
  computeIsRanging,
  computeZScore,
  classifyRsiZone,
  isVolumeSpike,
} = require('../../../src/services/features/feature.service');

describe('classifyRsiZone', () => {
  test('should return OVERSOLD for rsi < 30', () => {
    expect(classifyRsiZone(25)).toBe('OVERSOLD');
  });

  test('should return PULLBACK for rsi between 30 and 45', () => {
    expect(classifyRsiZone(40)).toBe('PULLBACK');
  });

  test('should return NEUTRAL for rsi between 45 and 65', () => {
    expect(classifyRsiZone(55)).toBe('NEUTRAL');
  });

  test('should return OVERBOUGHT for rsi >= 65', () => {
    expect(classifyRsiZone(70)).toBe('OVERBOUGHT');
  });

  test('should return NEUTRAL for null rsi', () => {
    expect(classifyRsiZone(null)).toBe('NEUTRAL');
  });

  test('should use adaptive thresholds when provided', () => {
    const adaptive = { rsi_oversold: 20, rsi_pullback: 35, rsi_overbought: 60 };
    expect(classifyRsiZone(15, adaptive)).toBe('OVERSOLD');
    expect(classifyRsiZone(25, adaptive)).toBe('PULLBACK');
    expect(classifyRsiZone(50, adaptive)).toBe('NEUTRAL');
    expect(classifyRsiZone(65, adaptive)).toBe('OVERBOUGHT');
  });
});

describe('isVolumeSpike', () => {
  test('should return true when volume > 1.5 * sma', () => {
    expect(isVolumeSpike(2000, 1000)).toBe(true);
  });

  test('should return false when volume <= 1.5 * sma', () => {
    expect(isVolumeSpike(1400, 1000)).toBe(false);
  });

  test('should return false when sma is null', () => {
    expect(isVolumeSpike(2000, null)).toBe(false);
  });

  test('should return false when sma is 0', () => {
    expect(isVolumeSpike(2000, 0)).toBe(false);
  });

  test('should use adaptive threshold when provided', () => {
    const adaptive = { volume_spike_threshold: 1800 };
    expect(isVolumeSpike(2000, 1000, adaptive)).toBe(true);
    expect(isVolumeSpike(1700, 1000, adaptive)).toBe(false);
  });
});

describe('computeIsRanging', () => {
  test('should return true for narrow range, no breakout, NEUTRAL rsi', () => {
    const candles = Array.from({ length: 25 }, (_, i) => ({
      high: (1000 + i * 0.5).toFixed(2),
      low: (990 + i * 0.5).toFixed(2),
    }));
    const atr_values = Array.from({ length: 25 }, () => 10);

    expect(computeIsRanging(candles, 24, atr_values, false, 'NEUTRAL')).toBe(true);
  });

  test('should return true for PULLBACK rsi_zone', () => {
    const candles = Array.from({ length: 25 }, (_, i) => ({
      high: (1000 + i * 0.5).toFixed(2),
      low: (990 + i * 0.5).toFixed(2),
    }));
    const atr_values = Array.from({ length: 25 }, () => 10);

    expect(computeIsRanging(candles, 24, atr_values, false, 'PULLBACK')).toBe(true);
  });

  test('should return false for wide price range', () => {
    const candles = Array.from({ length: 25 }, (_, i) => ({
      high: (1000 + i * 20).toFixed(2),
      low: (500 + i * 20).toFixed(2),
    }));
    const atr_values = Array.from({ length: 25 }, () => 10);

    expect(computeIsRanging(candles, 24, atr_values, false, 'NEUTRAL')).toBe(false);
  });

  test('should return false when breakout is true', () => {
    const candles = Array.from({ length: 25 }, (_, i) => ({
      high: (1000 + i * 0.5).toFixed(2),
      low: (990 + i * 0.5).toFixed(2),
    }));
    const atr_values = Array.from({ length: 25 }, () => 10);

    expect(computeIsRanging(candles, 24, atr_values, true, 'NEUTRAL')).toBe(false);
  });

  test('should return false when less than 20 candles available (i < 20)', () => {
    const candles = Array.from({ length: 25 }, (_, i) => ({
      high: (1000 + i * 0.5).toFixed(2),
      low: (990 + i * 0.5).toFixed(2),
    }));
    const atr_values = Array.from({ length: 25 }, () => 10);

    expect(computeIsRanging(candles, 15, atr_values, false, 'NEUTRAL')).toBe(false);
  });

  test('should return false for OVERBOUGHT rsi_zone', () => {
    const candles = Array.from({ length: 25 }, (_, i) => ({
      high: (1000 + i * 0.5).toFixed(2),
      low: (990 + i * 0.5).toFixed(2),
    }));
    const atr_values = Array.from({ length: 25 }, () => 10);

    expect(computeIsRanging(candles, 24, atr_values, false, 'OVERBOUGHT')).toBe(false);
  });
});

describe('computeZScore', () => {
  test('should return numeric z-score with 20+ candles', () => {
    const candles = Array.from({ length: 25 }, (_, i) => ({
      adjusted_close: (100 + i * 2).toFixed(2),
    }));

    const result = computeZScore(candles, 24);
    expect(result).not.toBeNull();
    expect(typeof result).toBe('number');
    expect(result).toBeCloseTo(1.6475, 3);
  });

  test('should return null with fewer than 20 candles', () => {
    const candles = Array.from({ length: 25 }, (_, i) => ({
      adjusted_close: (100 + i * 2).toFixed(2),
    }));

    expect(computeZScore(candles, 15)).toBeNull();
  });

  test('should return 0 when all prices are the same', () => {
    const candles = Array.from({ length: 25 }, () => ({
      adjusted_close: '100.00',
    }));

    expect(computeZScore(candles, 24)).toBe(0);
  });

  test('should return negative z-score when current price is below mean', () => {
    const candles = Array.from({ length: 25 }, (_, i) => ({
      adjusted_close: (200 - i * 2).toFixed(2),
    }));

    const result = computeZScore(candles, 24);
    expect(result).toBeLessThan(0);
  });
});
