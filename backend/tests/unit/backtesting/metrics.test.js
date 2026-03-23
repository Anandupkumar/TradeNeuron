const { calculateMetrics, calculateMaxDrawdown, calculateSharpeRatio } = require('../../../src/services/backtesting/metrics.service');

describe('Metrics Service', () => {
  test('should calculate basic metrics', () => {
    const trades = [
      { result: 'WIN', net_return: 5.0, days: 3 },
      { result: 'WIN', net_return: 3.0, days: 5 },
      { result: 'LOSS', net_return: -2.5, days: 2 },
      { result: 'NEUTRAL', net_return: 0.5, days: 10 },
    ];

    const metrics = calculateMetrics(trades);
    expect(metrics.total_signals).toBe(4);
    expect(metrics.wins).toBe(2);
    expect(metrics.losses).toBe(1);
    expect(metrics.neutral).toBe(1);
    expect(metrics.win_rate_pct).toBe(50);
    expect(metrics.avg_return_pct).toBeCloseTo(1.5, 1);
    expect(metrics.avg_holding_days).toBe(5);
  });

  test('should calculate profit factor', () => {
    const trades = [
      { result: 'WIN', net_return: 10, days: 5 },
      { result: 'LOSS', net_return: -5, days: 3 },
    ];

    const metrics = calculateMetrics(trades);
    expect(metrics.profit_factor).toBe(2);
  });

  test('should handle empty trades', () => {
    const metrics = calculateMetrics([]);
    expect(metrics.total_signals).toBe(0);
    expect(metrics.win_rate_pct).toBe(0);
    expect(metrics.sharpe_ratio).toBeNull();
  });

  test('max drawdown should be 0 for always-winning trades', () => {
    const returns = [1, 2, 3, 4, 5];
    expect(calculateMaxDrawdown(returns)).toBe(0);
  });

  test('max drawdown should detect peak-to-trough decline', () => {
    const returns = [5, 3, -10, 2, 1];
    const dd = calculateMaxDrawdown(returns);
    expect(dd).toBeGreaterThan(0);
  });

  test('Sharpe ratio should be null for single trade', () => {
    const result = calculateSharpeRatio([5]);
    expect(result).toBeNull();
  });
});
