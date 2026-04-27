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

// Fix 4: trail is armed either by kind==='TRAIL_ATR' (legacy) or by
// `trail_after_partial === 'ATR'` once a partial leg has fired (even for FIXED_RR strategies).
function shouldTrailAfterPartial(exit_policy, partial_fired) {
  return partial_fired && exit_policy && exit_policy.trail_after_partial === 'ATR';
}

function maybeTrailStop(current_stop, candle, direction, exit_policy, partial_fired = false) {
  if (!exit_policy) return current_stop;
  const kind_is_trail = exit_policy.kind === 'TRAIL_ATR';
  const post_partial_trail = shouldTrailAfterPartial(exit_policy, partial_fired);
  if (!kind_is_trail && !post_partial_trail) return current_stop;

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
  if (exit_reason === 'TARGET_HIT' || exit_reason === 'PARTIAL_THEN_TARGET' || exit_reason === 'PARTIAL_THEN_TRAIL_STOP') {
    return 'WIN';
  }
  if (exit_reason === 'SL_HIT' || exit_reason === 'TRAILING_STOP_HIT' || exit_reason === 'GAP_STOP') {
    return 'LOSS';
  }
  // PARTIAL_THEN_BE_STOP, PARTIAL_THEN_EXPIRED, EXPIRED, VOL_COMPRESSION all treated as NEUTRAL
  // (PnL sign from leg arithmetic determines win/loss classification downstream).
  return 'NEUTRAL';
}

// --- Bollinger-bandwidth helpers for Fix 6 (vol-compression exit) ---
function computeBollingerBandwidth(candles, period = 20) {
  if (!Array.isArray(candles) || candles.length < period) return null;
  const window = candles.slice(-period);
  const closes = window.map((c) => parseFloat(c.adjusted_close != null ? c.adjusted_close : c.close));
  if (closes.some((v) => Number.isNaN(v))) return null;
  const mean = closes.reduce((s, v) => s + v, 0) / period;
  const variance = closes.reduce((s, v) => s + (v - mean) * (v - mean), 0) / period;
  const stddev = Math.sqrt(variance);
  if (mean <= 0) return null;
  return (4 * stddev) / mean; // (upper - lower) / middle
}

function computeBandwidthPercentile(trailing_candles, current_bw, period = 20) {
  if (!Array.isArray(trailing_candles) || trailing_candles.length < period + 5) return null;
  const bws = [];
  for (let i = period; i <= trailing_candles.length; i++) {
    const bw = computeBollingerBandwidth(trailing_candles.slice(i - period, i), period);
    if (bw != null && !Number.isNaN(bw)) bws.push(bw);
  }
  if (bws.length < 5 || current_bw == null) return null;
  const below = bws.filter((v) => v < current_bw).length;
  return (below / bws.length) * 100;
}

function maybeVolCompressionExit({
  exit_policy,
  bars_held,
  trailing_candles,
  rolling_candles,
  partial_fired,
}) {
  if (!config.vol_compression_exit_enabled) return false;
  if (!exit_policy || exit_policy.vol_compression_exit_enabled !== true) return false;
  if (partial_fired) return false; // once partial fired, remainder follows BE / trail / target path
  const min_bars = exit_policy.min_bars_before_vol_exit != null
    ? exit_policy.min_bars_before_vol_exit
    : 3;
  if (bars_held < min_bars) return false;

  const percentile_threshold = exit_policy.vol_compression_bw_percentile != null
    ? exit_policy.vol_compression_bw_percentile
    : 15;
  if (!Array.isArray(trailing_candles) || trailing_candles.length < 25) return false;

  const current_bw = computeBollingerBandwidth(rolling_candles, 20);
  if (current_bw == null) return false;
  const percentile = computeBandwidthPercentile(trailing_candles, current_bw, 20);
  if (percentile == null) return false;
  return percentile <= percentile_threshold;
}

// --- Multi-leg exit evaluator ---
//
// State machine per candle (in order):
//   1. GAP check (first candle only)
//   2. Volatility-compression exit (Fix 6) — arms after min_bars_before_vol_exit, only pre-partial
//   3. Partial-exit trigger (Fix 1) — if price crosses partial_exit_price on this candle
//        - record partial leg, book partial_fraction of shares
//        - flip SL to breakeven (realistic_entry) if configured
//        - if trail_after_partial === 'ATR', arm trailing for remainder (Fix 4)
//   4. SL/trailing stop check on remainder — if hit, final exit
//   5. Target check on remainder — if hit, final exit
//   6. Maybe ratchet trailing stop for next candle
//
// Same-candle SL/target conflict resolution: SL takes priority (cursorrules §8).
// Same-candle partial/SL conflict: partial fires first, then SL if still triggered on remainder.
//   Rationale: partial trigger is closer to entry than SL, and typically intraday it occurs
//   before the adverse move. This matches the conservative realism of "what we'd actually see live".
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
        legs: [],
        partial_fired: false,
        partial_exit_price: null,
        partial_exit_day: null,
        partial_pnl_pct: null,
        sl_moved_to_breakeven: false,
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
      legs: [],
      partial_fired: false,
      partial_exit_price: null,
      partial_exit_day: null,
      partial_pnl_pct: null,
      sl_moved_to_breakeven: false,
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
  const trailing_candles = Array.isArray(options.trailing_candles) ? options.trailing_candles : null;

  let current_stop = parseFloat(with_policy.stop_loss);
  let current_target = parseFloat(with_policy.target_price);
  const initial_stop = current_stop;
  let trailing_armed = false;

  // Partial-exit state
  const partial_enabled = config.partial_exit_enabled === true
    && with_policy.exit_policy
    && with_policy.exit_policy.partial_exit_rr != null
    && with_policy.exit_policy.partial_fraction != null;

  let partial_price = null;
  if (partial_enabled) {
    const risk = direction === 'SHORT'
      ? initial_stop - realistic_entry
      : realistic_entry - initial_stop;
    if (risk > 0) {
      const rr = parseFloat(with_policy.exit_policy.partial_exit_rr);
      partial_price = direction === 'SHORT'
        ? roundDecimal(realistic_entry - rr * risk, 2)
        : roundDecimal(realistic_entry + rr * risk, 2);
    }
  }

  let partial_fired = false;
  let partial_exit_day = null;
  let partial_exit_price = null;
  let sl_moved_to_breakeven = false;
  const legs = [];

  const telemetry = {
    bars_held: 0,
    entry_gap_pct: expected_entry > 0
      ? roundDecimal(((realistic_entry - expected_entry) / expected_entry) * 100, 4)
      : 0,
    mfe_pct: 0,
    mae_pct: 0,
  };

  // Gap-stop guard (first candle entry slippage past stop)
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
      legs: [],
      partial_fired: false,
      partial_exit_price: null,
      partial_exit_day: null,
      partial_pnl_pct: null,
      sl_moved_to_breakeven: false,
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
      legs: [],
      partial_fired: false,
      partial_exit_price: null,
      partial_exit_day: null,
      partial_pnl_pct: null,
      sl_moved_to_breakeven: false,
    };
  }

  function legPnlPct(exit_price) {
    if (direction === 'SHORT') {
      return roundDecimal(((realistic_entry - exit_price) / realistic_entry) * 100, 4);
    }
    return roundDecimal(((exit_price - realistic_entry) / realistic_entry) * 100, 4);
  }

  function buildExit(final_reason, final_price, day) {
    const final_leg = {
      kind: 'FINAL',
      reason: final_reason,
      price: roundDecimal(final_price, 2),
      day: day + 1,
      pnl_pct: legPnlPct(final_price),
    };
    legs.push(final_leg);
    const combined_reason = partial_fired
      ? (final_reason === 'TARGET_HIT'
        ? 'PARTIAL_THEN_TARGET'
        : final_reason === 'TRAILING_STOP_HIT'
          ? 'PARTIAL_THEN_TRAIL_STOP'
          : final_reason === 'SL_HIT'
            ? (sl_moved_to_breakeven ? 'PARTIAL_THEN_BE_STOP' : 'PARTIAL_THEN_BE_STOP')
            : final_reason === 'EXPIRED' || final_reason === 'EXPIRED_PENALIZED'
              ? 'PARTIAL_THEN_EXPIRED'
              : final_reason === 'VOL_COMPRESSION'
                ? 'VOL_COMPRESSION'
                : final_reason)
      : final_reason;

    // Legacy single-leg PnL for backward compatibility with non-partial consumers
    let legacy_exit_price = final_leg.price;
    if (partial_fired) {
      const partial_fraction = parseFloat(with_policy.exit_policy.partial_fraction) || 0.5;
      legacy_exit_price = roundDecimal(
        partial_fraction * partial_exit_price + (1 - partial_fraction) * final_leg.price,
        2
      );
    }

    const partial_pnl = partial_fired ? legPnlPct(partial_exit_price) : null;

    return {
      result: buildResult(combined_reason),
      exit_reason: combined_reason,
      exit_price: legacy_exit_price,
      realistic_entry,
      days: day + 1,
      bars_held: telemetry.bars_held,
      gap_open: false,
      entry_gap_pct: telemetry.entry_gap_pct,
      mfe_pct: roundDecimal(telemetry.mfe_pct, 4),
      mae_pct: roundDecimal(telemetry.mae_pct, 4),
      legs,
      partial_fired,
      partial_exit_price: partial_fired ? roundDecimal(partial_exit_price, 2) : null,
      partial_exit_day: partial_fired ? partial_exit_day : null,
      partial_pnl_pct: partial_pnl,
      partial_fraction: partial_fired
        ? parseFloat(with_policy.exit_policy.partial_fraction)
        : null,
      sl_moved_to_breakeven,
      final_leg_reason: final_reason,
      final_leg_price: final_leg.price,
      initial_stop: roundDecimal(initial_stop, 2),
    };
  }

  for (let day = 0; day < candles_to_eval.length; day++) {
    const candle = candles_to_eval[day];
    telemetry.bars_held = day + 1;
    updatePathTelemetry(realistic_entry, candle, direction, telemetry);

    const low = parseFloat(candle.low);
    const high = parseFloat(candle.high);

    // Vol-compression exit (Fix 6) — evaluated at close, only pre-partial.
    if (trailing_candles && !partial_fired) {
      const rolling_candles = [...trailing_candles.slice(-(19)), ...candles_to_eval.slice(0, day + 1)];
      if (maybeVolCompressionExit({
        exit_policy: with_policy.exit_policy,
        bars_held: telemetry.bars_held,
        trailing_candles,
        rolling_candles,
        partial_fired,
      })) {
        const close_price = parseFloat(candle.adjusted_close != null ? candle.adjusted_close : candle.close);
        return buildExit('VOL_COMPRESSION', close_price, day);
      }
    }

    // Partial-exit trigger — checked before SL/target because partial is closer to entry by design.
    if (!partial_fired && partial_enabled && partial_price != null) {
      const hit = direction === 'SHORT' ? (low <= partial_price) : (high >= partial_price);
      if (hit) {
        partial_fired = true;
        partial_exit_day = day + 1;
        partial_exit_price = partial_price;
        legs.push({
          kind: 'PARTIAL',
          reason: 'PARTIAL_FILL',
          price: roundDecimal(partial_exit_price, 2),
          day: partial_exit_day,
          pnl_pct: legPnlPct(partial_exit_price),
          fraction: parseFloat(with_policy.exit_policy.partial_fraction),
        });

        if (with_policy.exit_policy.move_sl_to_breakeven_after_partial) {
          current_stop = roundDecimal(realistic_entry, 2);
          sl_moved_to_breakeven = true;
        }

        // If remainder should trail, seed trail from this bar
        if (shouldTrailAfterPartial(with_policy.exit_policy, true)) {
          const seeded_stop = maybeTrailStop(current_stop, candle, direction, with_policy.exit_policy, true);
          if (seeded_stop !== current_stop) {
            trailing_armed = true;
            current_stop = seeded_stop;
          }
        }
        // Continue with remainder on this same candle — check stop/target next
      }
    }

    // SL check on remainder (conservative: SL wins same-candle conflict)
    if (direction === 'SHORT') {
      if (high >= current_stop) {
        const exit_reason = trailing_armed ? 'TRAILING_STOP_HIT' : 'SL_HIT';
        return buildExit(exit_reason, current_stop, day);
      }
      if (low <= current_target) {
        return buildExit('TARGET_HIT', current_target, day);
      }
    } else {
      if (low <= current_stop) {
        const exit_reason = trailing_armed ? 'TRAILING_STOP_HIT' : 'SL_HIT';
        return buildExit(exit_reason, current_stop, day);
      }
      if (high >= current_target) {
        return buildExit('TARGET_HIT', current_target, day);
      }
    }

    // Ratchet trailing stop for next bar
    const next_stop = maybeTrailStop(current_stop, candle, direction, with_policy.exit_policy, partial_fired);
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
      legs,
      partial_fired,
      partial_exit_price: partial_fired ? roundDecimal(partial_exit_price, 2) : null,
      partial_exit_day: partial_fired ? partial_exit_day : null,
      partial_pnl_pct: partial_fired ? legPnlPct(partial_exit_price) : null,
      partial_fraction: partial_fired
        ? parseFloat(with_policy.exit_policy.partial_fraction)
        : null,
      sl_moved_to_breakeven,
      initial_stop: roundDecimal(initial_stop, 2),
    };
  }

  const last_candle = candles_to_eval[candles_to_eval.length - 1];
  const exit_price = last_candle ? parseFloat(last_candle.adjusted_close) : realistic_entry;
  return buildExit('EXPIRED', exit_price, candles_to_eval.length - 1);
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
  computeBollingerBandwidth,
  computeBandwidthPercentile,
};
