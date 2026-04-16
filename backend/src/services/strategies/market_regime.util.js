const config = require('../../config/env');
const { REGIME_BREADTH_THRESHOLDS } = require('../../config/constants');

function computeBreadthPct(snapshot) {
  if (!snapshot) return null;
  const total = parseInt(snapshot.total_symbols, 10) || 0;
  if (total <= 0) return null;

  const uptrend_pct = ((parseInt(snapshot.uptrend_count, 10) || 0) / total) * 100;
  const rs_positive_pct = ((parseInt(snapshot.rs_positive_count, 10) || 0) / total) * 100;
  const slope_positive_pct = ((parseInt(snapshot.slope_positive_count, 10) || 0) / total) * 100;

  return (uptrend_pct + rs_positive_pct + slope_positive_pct) / 3;
}

function computePersistenceScore(history) {
  if (!history || history.length === 0) return 0;
  return history.reduce((score, day) => {
    if (!day) return score;
    const bullish = day.nifty_close > day.ema_200 && day.vix_close < day.vix_threshold && day.ema_20 > day.ema_50;
    const bearish = day.nifty_close < day.ema_200;
    if (bullish) return score + 1;
    if (bearish) return score - 1;
    return score;
  }, 0);
}

/**
 * Pure regime classifier — mirrors checkMarketRegime / live routing (no DB).
 * @param {object} p
 * @param {number|null} p.nifty_close
 * @param {number|null} p.ema_200
 * @param {number|null} p.ema_20
 * @param {number|null} p.ema_50
 * @param {number|null} p.vix_close
 * @param {number} [p.vix_threshold] - defaults to env VIX_THRESHOLD
 * @param {number|null} [p.breadth_pct]
 * @param {number} [p.persistence_score]
 * @returns {'BULLISH'|'SIDEWAYS'|'BEARISH'|'HIGH_VOLATILITY'|'UNKNOWN'}
 */
function computeMarketRegime({
  nifty_close,
  ema_200,
  ema_20,
  ema_50,
  vix_close,
  vix_threshold = config.vix_threshold,
  breadth_pct = null,
  persistence_score = 0,
}) {
  if (nifty_close == null || ema_200 == null || vix_close == null) {
    return 'UNKNOWN';
  }

  const nifty_above_ema200 = nifty_close > ema_200;
  const vix_is_calm = vix_close < vix_threshold;

  if (nifty_above_ema200 && vix_is_calm) {
    if (
      breadth_pct != null
      && breadth_pct < REGIME_BREADTH_THRESHOLDS.WEAK_BREADTH_PCT
      && persistence_score <= 0
    ) {
      return 'SIDEWAYS';
    }
    if (ema_20 != null && ema_50 != null && ema_50 !== 0) {
      const nifty_range = Math.abs(ema_20 - ema_50) / ema_50 * 100;
      if (nifty_range < 2.0) {
        return 'SIDEWAYS';
      }
    }
    if (persistence_score <= -2) {
      return 'SIDEWAYS';
    }
    return 'BULLISH';
  }

  if (!nifty_above_ema200) {
    if (
      vix_is_calm
      && breadth_pct != null
      && breadth_pct >= REGIME_BREADTH_THRESHOLDS.STRONG_BREADTH_PCT
      && persistence_score >= 2
    ) {
      return 'SIDEWAYS';
    }
    return 'BEARISH';
  }

  return 'HIGH_VOLATILITY';
}

module.exports = {
  computeMarketRegime,
  computeBreadthPct,
  computePersistenceScore,
};
