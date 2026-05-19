const {
  classifyTradeLifecycle,
  computeMovementEfficiency,
  computeUnrealizedR,
} = require('../../../src/utils/trade_lifecycle.util');

describe('trade_lifecycle.util', () => {
  test('should classify partial ATR trades as trailing', () => {
    const result = classifyTradeLifecycle(
      {
        direction: 'LONG',
        entry_price: 100,
        stop_loss: 90,
        max_hold_days: 10,
        exit_policy: { trail_after_partial: 'ATR' },
      },
      { partial_fired: true },
      [{ adjusted_close: 105, high: 106, low: 99 }]
    );

    expect(result.lifecycle_state).toBe('TRAILING');
  });

  test('should classify low-efficiency late trades as stale', () => {
    const candles = [
      { adjusted_close: 102, high: 103, low: 99 },
      { adjusted_close: 99, high: 103, low: 98 },
      { adjusted_close: 101, high: 102, low: 98 },
      { adjusted_close: 100.5, high: 101, low: 99 },
      { adjusted_close: 100.2, high: 101, low: 99 },
      { adjusted_close: 100.1, high: 101, low: 99 },
    ];

    const result = classifyTradeLifecycle(
      { direction: 'LONG', entry_price: 100, stop_loss: 90, max_hold_days: 10 },
      { partial_fired: false },
      candles
    );

    expect(result.lifecycle_state).toBe('STALE');
  });

  test('should compute unrealized R for short trades', () => {
    const value = computeUnrealizedR(100, 110, 95, 'SHORT');

    expect(value).toBe(0.5);
  });

  test('should compute movement efficiency from candle path', () => {
    const value = computeMovementEfficiency(100, [
      { adjusted_close: 105 },
      { adjusted_close: 103 },
      { adjusted_close: 108 },
    ]);

    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThanOrEqual(1);
  });
});
