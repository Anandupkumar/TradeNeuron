const config = require('../../config/env');
const shadowValidationModel = require('../../models/shadow_validation.model');
const { VALIDATION_CRITERIA } = require('../../config/constants');

function sortLegacyCandidates(candidates) {
  return [...candidates].sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return b.risk_reward - a.risk_reward;
  });
}

function resolveDailyLimit(regime) {
  let eff_max_per_day = config.max_signals_per_day;
  if (config.regime_frequency_enabled && regime) {
    const mult_map = {
      BULLISH: config.freq_mult_bullish,
      BEARISH: config.freq_mult_bearish,
      SIDEWAYS: config.freq_mult_sideways,
      HIGH_VOLATILITY: config.freq_mult_high_vol,
    };
    const multiplier = mult_map[regime] != null ? mult_map[regime] : 1;
    eff_max_per_day = Math.max(0, Math.floor(config.max_signals_per_day * multiplier));
  }
  return eff_max_per_day;
}

function evaluatePromotionReadiness(runs) {
  const min_days = config.validation_min_shadow_days || VALIDATION_CRITERIA.MIN_SHADOW_DAYS;
  const min_overlap_pct = config.validation_min_shadow_overlap_pct || VALIDATION_CRITERIA.MIN_SHADOW_OVERLAP_PCT;
  if (runs.length < min_days) {
    return {
      promotion_ready: false,
      criteria: { min_days, min_overlap_pct },
      reason: `Only ${runs.length} shadow runs collected`,
    };
  }

  const avg_overlap = runs.reduce((sum, row) => {
    const denominator = Math.max(1, Math.max(row.baseline_selected, row.improved_selected));
    return sum + ((row.overlap_selected / denominator) * 100);
  }, 0) / runs.length;

  return {
    promotion_ready: avg_overlap >= min_overlap_pct,
    criteria: { min_days, min_overlap_pct, avg_overlap: Math.round(avg_overlap * 100) / 100 },
    reason: avg_overlap >= min_overlap_pct
      ? `Average overlap ${avg_overlap.toFixed(2)}% met threshold`
      : `Average overlap ${avg_overlap.toFixed(2)}% below threshold`,
  };
}

async function recordShadowComparison({ date, regime, candidates, improved_selected }) {
  const daily_limit = resolveDailyLimit(regime);
  const legacy_selected = sortLegacyCandidates(candidates).slice(0, daily_limit);
  const improved_symbols = improved_selected.map((signal) => signal.symbol);
  const legacy_symbols = legacy_selected.map((signal) => signal.symbol);
  const overlap_selected = improved_symbols.filter((symbol) => legacy_symbols.includes(symbol)).length;

  const recent_runs = await shadowValidationModel.findRecent(config.validation_min_shadow_days || VALIDATION_CRITERIA.MIN_SHADOW_DAYS);
  const readiness = evaluatePromotionReadiness([
    ...recent_runs,
    {
      baseline_selected: legacy_selected.length,
      improved_selected: improved_selected.length,
      overlap_selected,
    },
  ]);

  await shadowValidationModel.upsert({
    comparison_date: date,
    regime,
    candidate_count: candidates.length,
    baseline_selected: legacy_selected.length,
    improved_selected: improved_selected.length,
    overlap_selected,
    baseline_selection: legacy_symbols,
    improved_selection: improved_symbols,
    baseline_avg_confidence: legacy_selected.length > 0
      ? legacy_selected.reduce((sum, item) => sum + (parseFloat(item.confidence) || 0), 0) / legacy_selected.length
      : null,
    improved_avg_ranking_score: improved_selected.length > 0
      ? improved_selected.reduce((sum, item) => sum + (parseFloat(item.ranking_score) || 0), 0) / improved_selected.length
      : null,
    criteria_json: readiness.criteria,
    promotion_ready: readiness.promotion_ready,
  });

  return {
    legacy_selected,
    improved_selected,
    overlap_selected,
    readiness,
  };
}

module.exports = {
  sortLegacyCandidates,
  recordShadowComparison,
  evaluatePromotionReadiness,
};
