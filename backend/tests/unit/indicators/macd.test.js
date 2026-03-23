const { calculateMacd } = require('../../../src/services/indicators/macd.service');

describe('MACD Service', () => {
  test('should return all nulls for insufficient data', () => {
    const result = calculateMacd([100, 101, 102]);
    expect(result.macd_line.every((v) => v === null)).toBe(true);
  });

  test('should produce macd_line, macd_signal, and macd_histogram', () => {
    const values = Array.from({ length: 100 }, (_, i) => 100 + Math.sin(i * 0.1) * 10);
    const result = calculateMacd(values);

    expect(result.macd_line).toHaveLength(100);
    expect(result.macd_signal).toHaveLength(100);
    expect(result.macd_histogram).toHaveLength(100);

    const valid_line = result.macd_line.filter((v) => v !== null);
    expect(valid_line.length).toBeGreaterThan(0);
  });

  test('histogram should equal line minus signal', () => {
    const values = Array.from({ length: 100 }, (_, i) => 100 + i * 0.5);
    const { macd_line, macd_signal, macd_histogram } = calculateMacd(values);

    for (let i = 0; i < 100; i++) {
      if (macd_line[i] !== null && macd_signal[i] !== null && macd_histogram[i] !== null) {
        expect(Math.abs(macd_histogram[i] - (macd_line[i] - macd_signal[i]))).toBeLessThan(0.01);
      }
    }
  });
});
