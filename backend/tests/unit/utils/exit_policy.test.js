const {
  attachExitPolicy,
  evaluateSignalExit,
} = require('../../../src/utils/exit_policy.util');

describe('exit_policy.util', () => {
  test('should attach fixed RR policy for trend pullback', () => {
    const signal = attachExitPolicy({
      strategy: 'TREND_PULLBACK',
      direction: 'LONG',
      entry_price: 100,
      stop_loss: 90,
    });

    expect(signal.exit_policy.kind).toBe('FIXED_RR');
    expect(signal.target_price).toBe(122.5);
    expect(signal.risk_reward).toBe(2.25);
    expect(signal.max_hold_days).toBe(12);
  });

  test('should trigger trailing stop hit after stop is ratcheted higher', () => {
    const evaluation = evaluateSignalExit({
      strategy: 'BREAKOUT',
      direction: 'LONG',
      entry_price: 100,
      stop_loss: 90,
      target_price: 130,
      exit_policy: { kind: 'TRAIL_ATR', atr_value: 5, trail_atr_multiple: 2.0 },
      max_hold_days: 5,
    }, [
      { open: 101, high: 110, low: 101, adjusted_close: 109 },
      { open: 108, high: 112, low: 99, adjusted_close: 100 },
    ]);

    expect(evaluation.exit_reason).toBe('TRAILING_STOP_HIT');
    expect(evaluation.exit_price).toBe(100);
    expect(evaluation.days).toBe(2);
    expect(evaluation.bars_held).toBe(2);
  });

  test('should not expire a partial live path before max hold is reached', () => {
    const evaluation = evaluateSignalExit({
      strategy: 'BREAKOUT',
      direction: 'LONG',
      entry_price: 100,
      stop_loss: 90,
      target_price: 130,
      exit_policy: { kind: 'TRAIL_ATR', atr_value: 5, trail_atr_multiple: 2.0 },
      max_hold_days: 5,
    }, [
      { open: 101, high: 106, low: 99, adjusted_close: 104 },
      { open: 104, high: 108, low: 103, adjusted_close: 107 },
    ]);

    expect(evaluation.exit_reason).toBeNull();
    expect(evaluation.result).toBeNull();
  });

  test('should force close at the last candle in backtests', () => {
    const evaluation = evaluateSignalExit({
      strategy: 'MEAN_REVERSION',
      direction: 'LONG',
      entry_price: 100,
      stop_loss: 92,
      target_price: 110,
      exit_policy: { kind: 'LEVEL_TARGET' },
      max_hold_days: 5,
    }, [
      { open: 101, high: 104, low: 99, adjusted_close: 103 },
      { open: 103, high: 105, low: 102, adjusted_close: 104 },
    ], {
      force_close_on_last_candle: true,
    });

    expect(evaluation.exit_reason).toBe('EXPIRED');
    expect(evaluation.exit_price).toBe(104);
    expect(evaluation.result).toBe('NEUTRAL');
  });
});
