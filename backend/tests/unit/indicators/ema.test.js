const { calculateEma, calculateAllEma } = require('../../../src/services/indicators/ema.service');

describe('EMA Service', () => {
  test('should return all nulls when data length < period', () => {
    const result = calculateEma([100, 101, 102], 20);
    expect(result).toHaveLength(3);
    expect(result.every((v) => v === null)).toBe(true);
  });

  test('should calculate EMA with correct length', () => {
    const values = Array.from({ length: 50 }, (_, i) => 100 + i * 0.5);
    const result = calculateEma(values, 20);
    expect(result).toHaveLength(50);
    expect(result[18]).toBeNull();
    expect(result[19]).not.toBeNull();
    expect(typeof result[49]).toBe('number');
  });

  test('should calculate all three EMA periods', () => {
    const values = Array.from({ length: 250 }, (_, i) => 100 + Math.sin(i * 0.1) * 10);
    const { ema_20, ema_50, ema_200 } = calculateAllEma(values);

    expect(ema_20).toHaveLength(250);
    expect(ema_50).toHaveLength(250);
    expect(ema_200).toHaveLength(250);
    expect(ema_200[198]).toBeNull();
    expect(ema_200[199]).not.toBeNull();
  });

  test('EMA should follow the trend direction', () => {
    const rising = Array.from({ length: 50 }, (_, i) => 100 + i);
    const result = calculateEma(rising, 20);
    const valid = result.filter((v) => v !== null);
    for (let i = 1; i < valid.length; i++) {
      expect(valid[i]).toBeGreaterThan(valid[i - 1]);
    }
  });
});
