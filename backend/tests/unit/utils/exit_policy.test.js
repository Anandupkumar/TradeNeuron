const {
  attachExitPolicy,
  evaluateSignalExit,
} = require('../../../src/utils/exit_policy.util');
const { applyExpiredPenalty } = require('../../../src/utils/exit_accounting.util');

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

  test('should classify partial then target as a multi-leg target exit', () => {
    const evaluation = evaluateSignalExit({
      strategy: 'TREND_PULLBACK',
      direction: 'LONG',
      entry_price: 100,
      stop_loss: 90,
      target_price: 122.5,
      exit_policy: {
        kind: 'FIXED_RR',
        partial_exit_rr: 1,
        partial_fraction: 0.5,
        move_sl_to_breakeven_after_partial: true,
        trail_after_partial: 'NONE',
      },
      max_hold_days: 5,
    }, [
      { open: 100, high: 111, low: 101, adjusted_close: 110 },
      { open: 111, high: 123, low: 111, adjusted_close: 122.5 },
    ]);

    expect(evaluation.partial_fired).toBe(true);
    expect(evaluation.exit_reason).toBe('PARTIAL_THEN_TARGET');
    expect(evaluation.partial_exit_price).toBe(110);
  });

  test('should classify partial then breakeven stop', () => {
    const evaluation = evaluateSignalExit({
      strategy: 'TREND_PULLBACK',
      direction: 'LONG',
      entry_price: 100,
      stop_loss: 90,
      target_price: 122.5,
      exit_policy: {
        kind: 'FIXED_RR',
        partial_exit_rr: 1,
        partial_fraction: 0.5,
        move_sl_to_breakeven_after_partial: true,
        trail_after_partial: 'NONE',
      },
      max_hold_days: 5,
    }, [
      { open: 100, high: 111, low: 99, adjusted_close: 110 },
      { open: 110, high: 112, low: 100, adjusted_close: 101 },
    ]);

    expect(evaluation.partial_fired).toBe(true);
    expect(evaluation.exit_reason).toBe('PARTIAL_THEN_BE_STOP');
  });

  test('should apply expired penalty to negligible movement exits', () => {
    const result = applyExpiredPenalty('EXPIRED', 0.05);

    expect(result.exit_reason).toBe('EXPIRED_PENALIZED');
    expect(result.penalty_applied).toBe(true);
    expect(result.pnl_pct).toBeLessThan(0.05);
  });
});
