const config = require('../config/env');
const { roundDecimal } = require('./math.util');

function priceFromCandle(candle) {
  if (!candle) return null;
  const raw = candle.adjusted_close != null ? candle.adjusted_close : candle.close;
  const price = raw != null ? parseFloat(raw) : null;
  return price != null && !Number.isNaN(price) ? price : null;
}

function computeUnrealizedR(entry_price, stop_loss, current_price, direction = 'LONG') {
  const entry = parseFloat(entry_price);
  const stop = parseFloat(stop_loss);
  const current = parseFloat(current_price);
  if (!(entry > 0) || !(current > 0)) return null;
  const risk = direction === 'SHORT' ? stop - entry : entry - stop;
  if (!(risk > 0)) return null;
  const move = direction === 'SHORT' ? entry - current : current - entry;
  return move / risk;
}

function computeMovementEfficiency(entry_price, candles, direction = 'LONG') {
  if (!candles || candles.length === 0) return null;
  const entry = parseFloat(entry_price);
  const current = priceFromCandle(candles[candles.length - 1]);
  if (!(entry > 0) || !(current > 0)) return null;

  let rolling_distance = 0;
  let previous = entry;
  for (const candle of candles) {
    const price = priceFromCandle(candle);
    if (!(price > 0)) continue;
    rolling_distance += Math.abs(price - previous);
    previous = price;
  }
  if (rolling_distance <= 0) return null;
  const net_move = direction === 'SHORT' ? entry - current : current - entry;
  return Math.abs(net_move) / rolling_distance;
}

function isCompressing(candles) {
  if (!candles || candles.length < 5) return false;
  const recent = candles.slice(-3);
  const prior = candles.slice(Math.max(0, candles.length - 8), Math.max(0, candles.length - 3));
  if (prior.length < 2) return false;

  const avgRangePct = (rows) => {
    const ranges = rows
      .map((row) => {
        const close = priceFromCandle(row);
        const high = row.high != null ? parseFloat(row.high) : null;
        const low = row.low != null ? parseFloat(row.low) : null;
        if (!(close > 0) || high == null || low == null) return null;
        return ((high - low) / close) * 100;
      })
      .filter((value) => value != null && !Number.isNaN(value));
    if (ranges.length === 0) return null;
    return ranges.reduce((sum, value) => sum + value, 0) / ranges.length;
  };

  const recent_range = avgRangePct(recent);
  const prior_range = avgRangePct(prior);
  return recent_range != null && prior_range != null && recent_range < prior_range * 0.6;
}

function classifyTradeLifecycle(trade, evaluation, candles, options = {}) {
  if (evaluation && evaluation.exit_reason) {
    return { lifecycle_state: 'EXITED', lifecycle_note: `Closed via ${evaluation.exit_reason}` };
  }

  const direction = trade.direction || options.direction || 'LONG';
  const entry_price = options.entry_price != null ? options.entry_price : trade.actual_entry_price || trade.entry_price;
  const max_hold_days = parseInt(trade.max_hold_days || options.max_hold_days || config.holding_period_days, 10);
  const bars_held = candles ? candles.length : 0;
  const current_price = candles && candles.length > 0 ? priceFromCandle(candles[candles.length - 1]) : null;
  const unrealized_r = current_price != null
    ? computeUnrealizedR(entry_price, trade.stop_loss, current_price, direction)
    : null;
  const movement_efficiency = computeMovementEfficiency(entry_price, candles, direction);
  const hold_elapsed_pct = max_hold_days > 0 ? bars_held / max_hold_days : 0;

  if (
    hold_elapsed_pct >= 0.6
    && unrealized_r != null
    && unrealized_r < 0.3
    && movement_efficiency != null
    && movement_efficiency < 0.35
  ) {
    return {
      lifecycle_state: 'STALE',
      lifecycle_note: `Stale: ${roundDecimal(unrealized_r, 2)}R after ${bars_held}/${max_hold_days} bars`,
    };
  }

  if (isCompressing(candles)) {
    return {
      lifecycle_state: 'COMPRESSING',
      lifecycle_note: 'Recent candle ranges compressed versus prior range',
    };
  }

  if (evaluation && evaluation.partial_fired) {
    let policy = trade.exit_policy || options.exit_policy || {};
    if (typeof policy === 'string') {
      try {
        policy = JSON.parse(policy);
      } catch (error) {
        policy = {};
      }
    }
    if (policy.trail_after_partial === 'ATR') {
      return { lifecycle_state: 'TRAILING', lifecycle_note: 'Partial booked; ATR trail armed on remainder' };
    }
    return { lifecycle_state: 'PARTIAL_EXITED', lifecycle_note: 'Partial exit booked; managing remainder' };
  }

  return { lifecycle_state: 'ACTIVE', lifecycle_note: 'Trade progressing normally' };
}

module.exports = {
  classifyTradeLifecycle,
  computeMovementEfficiency,
  computeUnrealizedR,
};
