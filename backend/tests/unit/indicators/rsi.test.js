const { calculateRsi } = require('../../../src/services/indicators/rsi.service');

describe('RSI Service', () => {
  test('should return all nulls when data is insufficient', () => {
    const result = calculateRsi([100, 101, 102]);
    expect(result.every((v) => v === null)).toBe(true);
  });

  test('should calculate RSI values in 0-100 range', () => {
    const values = Array.from({ length: 50 }, (_, i) => 100 + Math.sin(i * 0.3) * 10);
    const result = calculateRsi(values);
    const valid = result.filter((v) => v !== null);

    expect(valid.length).toBeGreaterThan(0);
    valid.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    });
  });

  test('RSI should be high for strongly rising prices', () => {
    const rising = Array.from({ length: 30 }, (_, i) => 100 + i * 2);
    const result = calculateRsi(rising);
    const last_rsi = result[result.length - 1];
    expect(last_rsi).toBeGreaterThan(60);
  });

  test('RSI should be low for strongly falling prices', () => {
    const falling = Array.from({ length: 30 }, (_, i) => 200 - i * 2);
    const result = calculateRsi(falling);
    const last_rsi = result[result.length - 1];
    expect(last_rsi).toBeLessThan(40);
  });
});
