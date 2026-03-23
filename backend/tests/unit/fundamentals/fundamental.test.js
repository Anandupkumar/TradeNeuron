const { computeHealthFlag } = require('../../../src/services/fundamentals/fundamental.service');

describe('Fundamental Health Flag', () => {
  test('should be healthy when all metrics are within bounds', () => {
    const result = computeHealthFlag({
      debt_to_equity: 0.5,
      eps_growth_yoy: 0.1,
      revenue_growth: 0.05,
      promoter_pledge: 10,
    });
    expect(result.is_healthy).toBe(true);
    expect(result.reason).toBeNull();
  });

  test('should reject high debt-to-equity', () => {
    const result = computeHealthFlag({
      debt_to_equity: 3.5,
      eps_growth_yoy: 0.1,
      revenue_growth: 0.05,
      promoter_pledge: 10,
    });
    expect(result.is_healthy).toBe(false);
    expect(result.reason).toContain('D/E ratio');
  });

  test('should reject negative EPS growth', () => {
    const result = computeHealthFlag({
      debt_to_equity: 0.5,
      eps_growth_yoy: -0.15,
      revenue_growth: 0.05,
      promoter_pledge: 10,
    });
    expect(result.is_healthy).toBe(false);
    expect(result.reason).toContain('EPS growth negative');
  });

  test('should reject negative revenue growth', () => {
    const result = computeHealthFlag({
      debt_to_equity: 0.5,
      eps_growth_yoy: 0.1,
      revenue_growth: -0.05,
      promoter_pledge: 10,
    });
    expect(result.is_healthy).toBe(false);
    expect(result.reason).toContain('Revenue growth negative');
  });

  test('should reject high promoter pledge', () => {
    const result = computeHealthFlag({
      debt_to_equity: 0.5,
      eps_growth_yoy: 0.1,
      revenue_growth: 0.05,
      promoter_pledge: 60,
    });
    expect(result.is_healthy).toBe(false);
    expect(result.reason).toContain('Promoter pledge');
  });

  test('should be healthy when metrics are null (fail-open)', () => {
    const result = computeHealthFlag({
      debt_to_equity: null,
      eps_growth_yoy: null,
      revenue_growth: null,
      promoter_pledge: null,
    });
    expect(result.is_healthy).toBe(true);
  });
});
