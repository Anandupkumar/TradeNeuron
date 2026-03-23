const { roundDecimal, pctChange, clamp } = require('../../../src/utils/math.util');

describe('Math Utilities', () => {
  test('roundDecimal should round to specified decimals', () => {
    expect(roundDecimal(1.2345, 2)).toBe(1.23);
    expect(roundDecimal(1.2355, 2)).toBe(1.24);
    expect(roundDecimal(1.2, 4)).toBe(1.2);
  });

  test('roundDecimal should return null for null input', () => {
    expect(roundDecimal(null)).toBeNull();
    expect(roundDecimal(undefined)).toBeNull();
  });

  test('pctChange should calculate correctly', () => {
    expect(pctChange(110, 100)).toBe(10);
    expect(pctChange(90, 100)).toBe(-10);
  });

  test('pctChange should return null for zero/null previous', () => {
    expect(pctChange(100, 0)).toBeNull();
    expect(pctChange(100, null)).toBeNull();
  });

  test('clamp should constrain value within bounds', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});
