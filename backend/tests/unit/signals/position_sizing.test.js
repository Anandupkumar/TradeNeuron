const { computePositionSizing } = require('../../../src/services/signals/signal.service');

describe('computePositionSizing', () => {
  test('LONG: should compute correct sizing without position cap', () => {
    const result = computePositionSizing(500, 450, 'LONG');

    expect(result).not.toBeNull();
    expect(result.shares_to_buy).toBe(200);
    expect(result.position_value).toBe(100000);
    expect(result.capital_risk_inr).toBe(10000);
  });

  test('LONG: should cap position when exceeding max_position_pct', () => {
    const result = computePositionSizing(100, 99, 'LONG');

    expect(result).not.toBeNull();
    expect(result.shares_to_buy).toBe(1000);
    expect(result.position_value).toBe(100000);
    expect(result.capital_risk_inr).toBe(1000);
  });

  test('SHORT: should use max_position_pct_short for cap', () => {
    const result = computePositionSizing(100, 101, 'SHORT');

    expect(result).not.toBeNull();
    expect(result.shares_to_buy).toBe(500);
    expect(result.position_value).toBe(50000);
    expect(result.capital_risk_inr).toBe(500);
  });

  test('LONG: should return null if risk_per_share <= 0', () => {
    const result = computePositionSizing(1000, 1050, 'LONG');
    expect(result).toBeNull();
  });

  test('SHORT: should return null if risk_per_share <= 0', () => {
    const result = computePositionSizing(1000, 950, 'SHORT');
    expect(result).toBeNull();
  });

  test('should return shares_to_buy=0 when entry exceeds max position value', () => {
    const result = computePositionSizing(200000, 199000, 'LONG');

    expect(result).not.toBeNull();
    expect(result.shares_to_buy).toBe(0);
    expect(result.position_value).toBe(0);
    expect(result.capital_risk_inr).toBe(0);
  });
});
