const config = require('../config/env');
const { EXIT_POLICY_PROFILES } = require('../config/constants');
const { roundDecimal } = require('./math.util');

function parseMaybeJson(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

function resolveStrategyKey(strategy_name) {
  if (!strategy_name) return 'TREND_PULLBACK';
  if (strategy_name === 'COMBINED') return 'COMBINED';
  if (strategy_name.includes('+')) return 'COMBINED';
  return strategy_name;
}

function getExitPolicyProfile(strategy_name) {
  const key = resolveStrategyKey(strategy_name);
  return EXIT_POLICY_PROFILES[key] || EXIT_POLICY_PROFILES.TREND_PULLBACK;
}

function computeRisk(entry_price, stop_loss, direction) {
  const entry = parseFloat(entry_price);
  const stop = parseFloat(stop_loss);
  if (!(entry > 0) || Number.isNaN(stop)) return null;
  const risk = direction === 'SHORT'
    ? stop - entry
    : entry - stop;
  return risk > 0 ? risk : null;
}

function computeTargetFromPolicy(entry_price, stop_loss, direction, exit_policy, fallback_target_price = null) {
  const risk = computeRisk(entry_price, stop_loss, direction);
  if (risk == null) return null;

  if (exit_policy.kind === 'LEVEL_TARGET' && fallback_target_price != null) {
    return roundDecimal(parseFloat(fallback_target_price), 2);
  }

  const rr_multiple = exit_policy.rr_multiple != null ? exit_policy.rr_multiple : 2.0;
  return direction === 'SHORT'
    ? roundDecimal(parseFloat(entry_price) - rr_multiple * risk, 2)
    : roundDecimal(parseFloat(entry_price) + rr_multiple * risk, 2);
}

function computeRiskReward(entry_price, stop_loss, target_price, direction) {
  const risk = computeRisk(entry_price, stop_loss, direction);
  if (risk == null || target_price == null) return null;
  const target = parseFloat(target_price);
  if (Number.isNaN(target)) return null;
  const reward = direction === 'SHORT'
    ? parseFloat(entry_price) - target
    : target - parseFloat(entry_price);
  if (reward <= 0) return null;
  return roundDecimal(reward / risk, 2);
}

function attachExitPolicy(signal) {
  if (!signal) return signal;

  const direction = signal.direction || 'LONG';
  const existing_policy = parseMaybeJson(signal.exit_policy) || {};
  const profile = getExitPolicyProfile(signal.strategy || signal.strategy_source);
  const exit_policy = {
    ...profile,
    ...existing_policy,
  };

  const target_price = computeTargetFromPolicy(
    signal.entry_price,
    signal.stop_loss,
    direction,
    exit_policy,
    signal.target_price
  );
  const risk_reward = computeRiskReward(signal.entry_price, signal.stop_loss, target_price, direction);

  return {
    ...signal,
    exit_policy,
    max_hold_days: signal.max_hold_days || exit_policy.max_hold_days || config.holding_period_days,
    target_price,
    risk_reward,
  };
}

function recomputeExitPlan(signal, next_stop_loss, opts = {}) {
  if (!signal) return signal;
  const base_signal = attachExitPolicy(signal);
  const next_signal = {
    ...base_signal,
    stop_loss: roundDecimal(parseFloat(next_stop_loss), 2),
    target_price: opts.keep_target_price
      ? base_signal.target_price
      : computeTargetFromPolicy(
        base_signal.entry_price,
        next_stop_loss,
        base_signal.direction || 'LONG',
        base_signal.exit_policy,
        base_signal.target_price
      ),
  };

  next_signal.risk_reward = computeRiskReward(
    next_signal.entry_price,
    next_signal.stop_loss,
    next_signal.target_price,
    next_signal.direction || 'LONG'
  );

  return next_signal;
}

function updatePathTelemetry(entry_price, candle, direction, telemetry) {
  const high = parseFloat(candle.high);
  const low = parseFloat(candle.low);
  if (!(entry_price > 0) || Number.isNaN(high) || Number.isNaN(low)) return telemetry;

  if (direction === 'SHORT') {
    const favorable = ((entry_price - low) / entry_price) * 100;
    const adverse = ((high - entry_price) / entry_price) * 100;
    telemetry.mfe_pct = Math.max(telemetry.mfe_pct, favorable);
    telemetry.mae_pct = Math.max(telemetry.mae_pct, adverse);
    return telemetry;
  }

  const favorable = ((high - entry_price) / entry_price) * 100;
  const adverse = ((entry_price - low) / entry_price) * 100;
  telemetry.mfe_pct = Math.max(telemetry.mfe_pct, favorable);
  telemetry.mae_pct = Math.max(telemetry.mae_pct, adverse);
  return telemetry;
}

function maybeTrailStop(current_stop, candle, direction, exit_policy) {
  if (!exit_policy || exit_policy.kind !== 'TRAIL_ATR') return current_stop;
  const atr_value = exit_policy.atr_value != null ? parseFloat(exit_policy.atr_value) : null;
  const trail_atr_multiple = exit_policy.trail_atr_multiple != null
    ? parseFloat(exit_policy.trail_atr_multiple)
    : 2.0;

  if (!(atr_value > 0) || !(trail_atr_multiple > 0)) return current_stop;

  if (direction === 'SHORT') {
    const next_stop = parseFloat(candle.low) + (trail_atr_multiple * atr_value);
    return roundDecimal(Math.min(parseFloat(current_stop), next_stop), 2);
  }

  const next_stop = parseFloat(candle.high) - (trail_atr_multiple * atr_value);
  return roundDecimal(Math.max(parseFloat(current_stop), next_stop), 2);
}

function buildResult(exit_reason) {
  if (exit_reason === 'TARGET_HIT') return 'WIN';
  if (exit_reason === 'SL_HIT' || exit_reason === 'TRAILING_STOP_HIT' || exit_reason === 'GAP_STOP') {
    return 'LOSS';
  }
  return 'NEUTRAL';
}

function evaluateSignalExit(signal, future_candles, options = {}) {
  const with_policy = attachExitPolicy(signal);

  if (!future_candles || future_candles.length === 0) {
    if (!options.force_close_on_last_candle) {
      return {
        result: null,
        exit_reason: null,
        exit_price: null,
        realistic_entry: parseFloat(with_policy.entry_price),
        days: 0,
        bars_held: 0,
        gap_open: false,
        entry_gap_pct: 0,
        mfe_pct: 0,
        mae_pct: 0,
      };
    }
    const fallback_entry = parseFloat(with_policy.entry_price);
    return {
      result: 'NEUTRAL',
      exit_reason: 'EXPIRED',
      exit_price: fallback_entry,
      realistic_entry: fallback_entry,
      days: 0,
      bars_held: 0,
      gap_open: false,
      entry_gap_pct: 0,
      mfe_pct: 0,
      mae_pct: 0,
    };
  }

  const direction = with_policy.direction || 'LONG';
  const first_candle = future_candles[0];
  const realistic_entry = options.entry_price_override != null
    ? parseFloat(options.entry_price_override)
    : parseFloat(first_candle.open);
  const expected_entry = parseFloat(with_policy.entry_price);
  const max_hold_days = with_policy.max_hold_days || config.holding_period_days;
  const candles_to_eval = future_candles.slice(0, Math.min(future_candles.length, max_hold_days));
  const reached_max_hold = future_candles.length >= max_hold_days;

  let current_stop = parseFloat(with_policy.stop_loss);
  let current_target = parseFloat(with_policy.target_price);
  let trailing_armed = false;
  const telemetry = {
    bars_held: 0,
    entry_gap_pct: expected_entry > 0
      ? roundDecimal(((realistic_entry - expected_entry) / expected_entry) * 100, 4)
      : 0,
    mfe_pct: 0,
    mae_pct: 0,
  };

  if (direction === 'SHORT' && realistic_entry >= current_stop) {
    return {
      result: 'LOSS',
      exit_reason: 'GAP_STOP',
      exit_price: realistic_entry,
      realistic_entry,
      days: 0,
      bars_held: 0,
      gap_open: true,
      entry_gap_pct: telemetry.entry_gap_pct,
      mfe_pct: 0,
      mae_pct: roundDecimal(((realistic_entry - expected_entry) / expected_entry) * 100, 4),
    };
  }
  if (direction !== 'SHORT' && realistic_entry <= current_stop) {
    return {
      result: 'LOSS',
      exit_reason: 'GAP_STOP',
      exit_price: realistic_entry,
      realistic_entry,
      days: 0,
      bars_held: 0,
      gap_open: true,
      entry_gap_pct: telemetry.entry_gap_pct,
      mfe_pct: 0,
      mae_pct: roundDecimal(((expected_entry - realistic_entry) / expected_entry) * 100, 4),
    };
  }

  for (let day = 0; day < candles_to_eval.length; day++) {
    const candle = candles_to_eval[day];
    telemetry.bars_held = day + 1;
    updatePathTelemetry(realistic_entry, candle, direction, telemetry);

    const low = parseFloat(candle.low);
    const high = parseFloat(candle.high);

    if (direction === 'SHORT') {
      if (high >= current_stop) {
        const exit_reason = trailing_armed ? 'TRAILING_STOP_HIT' : 'SL_HIT';
        return {
          result: buildResult(exit_reason),
          exit_reason,
          exit_price: current_stop,
          realistic_entry,
          days: day + 1,
          bars_held: telemetry.bars_held,
          gap_open: false,
          entry_gap_pct: telemetry.entry_gap_pct,
          mfe_pct: roundDecimal(telemetry.mfe_pct, 4),
          mae_pct: roundDecimal(telemetry.mae_pct, 4),
        };
      }
      if (low <= current_target) {
        return {
          result: 'WIN',
          exit_reason: 'TARGET_HIT',
          exit_price: current_target,
          realistic_entry,
          days: day + 1,
          bars_held: telemetry.bars_held,
          gap_open: false,
          entry_gap_pct: telemetry.entry_gap_pct,
          mfe_pct: roundDecimal(telemetry.mfe_pct, 4),
          mae_pct: roundDecimal(telemetry.mae_pct, 4),
        };
      }
    } else {
      if (low <= current_stop) {
        const exit_reason = trailing_armed ? 'TRAILING_STOP_HIT' : 'SL_HIT';
        return {
          result: buildResult(exit_reason),
          exit_reason,
          exit_price: current_stop,
          realistic_entry,
          days: day + 1,
          bars_held: telemetry.bars_held,
          gap_open: false,
          entry_gap_pct: telemetry.entry_gap_pct,
          mfe_pct: roundDecimal(telemetry.mfe_pct, 4),
          mae_pct: roundDecimal(telemetry.mae_pct, 4),
        };
      }
      if (high >= current_target) {
        return {
          result: 'WIN',
          exit_reason: 'TARGET_HIT',
          exit_price: current_target,
          realistic_entry,
          days: day + 1,
          bars_held: telemetry.bars_held,
          gap_open: false,
          entry_gap_pct: telemetry.entry_gap_pct,
          mfe_pct: roundDecimal(telemetry.mfe_pct, 4),
          mae_pct: roundDecimal(telemetry.mae_pct, 4),
        };
      }
    }

    const next_stop = maybeTrailStop(current_stop, candle, direction, with_policy.exit_policy);
    if (next_stop !== current_stop) {
      trailing_armed = true;
      current_stop = next_stop;
    }
  }

  if (!reached_max_hold && !options.force_close_on_last_candle) {
    return {
      result: null,
      exit_reason: null,
      exit_price: null,
      realistic_entry,
      days: candles_to_eval.length,
      bars_held: telemetry.bars_held,
      gap_open: false,
      entry_gap_pct: telemetry.entry_gap_pct,
      mfe_pct: roundDecimal(telemetry.mfe_pct, 4),
      mae_pct: roundDecimal(telemetry.mae_pct, 4),
    };
  }

  const last_candle = candles_to_eval[candles_to_eval.length - 1];
  const exit_price = last_candle ? parseFloat(last_candle.adjusted_close) : realistic_entry;
  return {
    result: 'NEUTRAL',
    exit_reason: 'EXPIRED',
    exit_price,
    realistic_entry,
    days: candles_to_eval.length,
    bars_held: telemetry.bars_held,
    gap_open: false,
    entry_gap_pct: telemetry.entry_gap_pct,
    mfe_pct: roundDecimal(telemetry.mfe_pct, 4),
    mae_pct: roundDecimal(telemetry.mae_pct, 4),
  };
}

function deriveConservativeTarget(raw_signals, direction) {
  const targets = raw_signals
    .map((signal) => signal.target_price != null ? parseFloat(signal.target_price) : null)
    .filter((value) => value != null && !Number.isNaN(value));
  if (targets.length === 0) return null;
  return direction === 'SHORT'
    ? roundDecimal(Math.max(...targets), 2)
    : roundDecimal(Math.min(...targets), 2);
}

module.exports = {
  attachExitPolicy,
  recomputeExitPlan,
  evaluateSignalExit,
  computeRiskReward,
  getExitPolicyProfile,
  deriveConservativeTarget,
};
