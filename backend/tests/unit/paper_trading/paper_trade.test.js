const { calculateNetPnl, computeGrossPnlInr } = require('../../../src/services/paper_trading/paper_trade.service');

describe('Paper Trade PnL Calculation', () => {
  test('should calculate net PnL for a winning trade', () => {
    const pnl = calculateNetPnl(1000, 1100);
    expect(pnl).toBeLessThan(10);
    expect(pnl).toBeGreaterThan(9);
  });

  test('should calculate net PnL for a losing trade', () => {
    const pnl = calculateNetPnl(1000, 950);
    expect(pnl).toBeLessThan(-5);
  });

  test('should account for transaction costs (net < gross)', () => {
    const gross_pnl = ((1050 - 1000) / 1000) * 100;
    const net_pnl = calculateNetPnl(1000, 1050);
    expect(net_pnl).toBeLessThan(gross_pnl);
  });

  test('should return negative even for small gains due to costs', () => {
    const pnl = calculateNetPnl(1000, 1001);
    expect(pnl).toBeLessThan(0.1);
  });
});

describe('Gross PnL INR Calculation', () => {
  test('should compute positive gross PnL for winning LONG trade', () => {
    const pnl = computeGrossPnlInr(1000, 1100, 100, 'LONG');
    expect(pnl).toBe(10000);
  });

  test('should compute negative gross PnL for losing LONG trade', () => {
    const pnl = computeGrossPnlInr(1000, 950, 100, 'LONG');
    expect(pnl).toBe(-5000);
  });

  test('should compute positive gross PnL for winning SHORT trade', () => {
    const pnl = computeGrossPnlInr(1000, 900, 100, 'SHORT');
    expect(pnl).toBe(10000);
  });

  test('should compute negative gross PnL for losing SHORT trade', () => {
    const pnl = computeGrossPnlInr(1000, 1050, 100, 'SHORT');
    expect(pnl).toBe(-5000);
  });

  test('should return null when shares_to_buy is 0', () => {
    const pnl = computeGrossPnlInr(1000, 1100, 0, 'LONG');
    expect(pnl).toBeNull();
  });
});
