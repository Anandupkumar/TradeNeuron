const config = require('../config/env');
const { roundDecimal } = require('./math.util');

function applyExpiredPenalty(exit_reason, pnl_pct) {
  if (exit_reason !== 'EXPIRED' || pnl_pct == null) {
    return {
      exit_reason,
      pnl_pct,
      penalty_applied: false,
      penalty_pct: 0,
    };
  }

  const abs_pnl = Math.abs(parseFloat(pnl_pct));
  if (abs_pnl >= config.expired_movement_threshold) {
    return {
      exit_reason,
      pnl_pct,
      penalty_applied: false,
      penalty_pct: 0,
    };
  }

  const movement_ratio = 1 - abs_pnl / config.expired_movement_threshold;
  const penalty = config.expired_min_penalty
    + (config.expired_max_penalty - config.expired_min_penalty) * movement_ratio;

  return {
    exit_reason: 'EXPIRED_PENALIZED',
    pnl_pct: roundDecimal(parseFloat(pnl_pct) + penalty, 4),
    penalty_applied: true,
    penalty_pct: roundDecimal(penalty, 4),
  };
}

module.exports = { applyExpiredPenalty };
