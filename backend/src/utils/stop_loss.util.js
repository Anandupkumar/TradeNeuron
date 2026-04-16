const { roundDecimal } = require('./math.util');
const { recomputeExitPlan } = require('./exit_policy.util');

/**
 * Cap stop distance as % of entry so risk stays within max_sl_pct_of_entry (e.g. 6%).
 * LONG: SL below entry — pull SL up toward entry if too wide.
 * SHORT: SL above entry — pull SL down toward entry if too wide.
 */
function capStopLossByEntryPct(entry_price, stop_loss, direction, max_sl_pct) {
  if (max_sl_pct == null || max_sl_pct <= 0) {
    return { stop_loss, changed: false };
  }
  const entry = parseFloat(entry_price);
  const sl = parseFloat(stop_loss);
  if (!(entry > 0) || sl == null || Number.isNaN(sl)) {
    return { stop_loss, changed: false };
  }

  const max_dist = entry * (max_sl_pct / 100);

  if (direction === 'LONG') {
    const dist = entry - sl;
    if (dist <= max_dist) return { stop_loss: sl, changed: false };
    const new_sl = roundDecimal(entry - max_dist, 2);
    return { stop_loss: new_sl, changed: true };
  }

  if (direction === 'SHORT') {
    const dist = sl - entry;
    if (dist <= max_dist) return { stop_loss: sl, changed: false };
    const new_sl = roundDecimal(entry + max_dist, 2);
    return { stop_loss: new_sl, changed: true };
  }

  return { stop_loss: sl, changed: false };
}

/**
 * Apply max SL % cap and recompute target + R:R using the signal exit policy.
 */
function applySlCapToSignal(signal, max_sl_pct) {
  if (!signal || max_sl_pct == null || max_sl_pct <= 0) return signal;
  const dir = signal.direction || 'LONG';
  const { stop_loss: new_sl, changed } = capStopLossByEntryPct(
    signal.entry_price,
    signal.stop_loss,
    dir,
    max_sl_pct
  );
  if (!changed) return signal;

  const recomputed = recomputeExitPlan({
    ...signal,
    direction: dir,
  }, new_sl);
  if (!recomputed || recomputed.risk_reward == null) return null;
  return recomputed;
}

module.exports = { capStopLossByEntryPct, applySlCapToSignal };
