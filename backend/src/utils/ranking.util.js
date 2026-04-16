const { clamp, roundDecimal } = require('./math.util');
const { RANKING_WEIGHTS } = require('../config/constants');

function scoreRelativeStrength(value, direction) {
  const rs = value != null ? parseFloat(value) : null;
  if (rs == null || Number.isNaN(rs)) return 50;
  const aligned = direction === 'SHORT' ? -rs : rs;
  if (aligned >= 10) return 100;
  if (aligned >= 5) return 85;
  if (aligned >= 0) return 70;
  if (aligned >= -5) return 45;
  return 20;
}

function scoreSectorAlignment(value, direction) {
  const rs = value != null ? parseFloat(value) : null;
  if (rs == null || Number.isNaN(rs)) return 50;
  const aligned = direction === 'SHORT' ? -rs : rs;
  if (aligned >= 5) return 90;
  if (aligned >= 0) return 75;
  if (aligned >= -5) return 40;
  return 15;
}

function scoreDeliveryQuality(feature) {
  const high_delivery = feature && (feature.is_high_delivery === 1 || feature.is_high_delivery === true);
  const volume_tier = feature && feature.volume_tier ? String(feature.volume_tier).toLowerCase() : 'normal';
  if (high_delivery) return 90;
  if (volume_tier === 'extreme') return 80;
  if (volume_tier === 'high') return 72;
  if (volume_tier === 'elevated') return 62;
  return 50;
}

function scoreSetupQuality(feature, strategy_source, direction) {
  if (!feature) return 50;
  let score = 50;
  const strategy = strategy_source || '';
  const is_breakout = feature.is_breakout === 1 || feature.is_breakout === true;
  const is_ranging = feature.is_ranging === 1 || feature.is_ranging === true;
  const near_support = feature.near_support === 1 || feature.near_support === true;
  const is_near_vwma = feature.is_near_vwma === 1 || feature.is_near_vwma === true
    || feature.is_near_vwap === 1 || feature.is_near_vwap === true;
  const close_position = feature.close_position != null ? parseFloat(feature.close_position) : null;
  const z_score = feature.z_score_20d != null ? parseFloat(feature.z_score_20d) : null;

  if (strategy.includes('BREAKOUT') && is_breakout) score += 15;
  if (strategy.includes('BREAKDOWN') && !is_breakout && close_position != null && close_position < 0.4) score += 15;
  if (strategy.includes('TREND_PULLBACK') && direction === 'LONG' && near_support) score += 12;
  if (strategy.includes('TREND_PULLBACK_SHORT') && direction === 'SHORT' && close_position != null && close_position < 0.45) score += 12;
  if (strategy.includes('RANGE') && is_ranging) score += 15;
  if (strategy.includes('MEAN_REVERSION') && z_score != null && z_score <= -2.0) score += 15;
  if (is_near_vwma) score += 8;

  return clamp(score, 0, 100);
}

function computeRankingScore({ confidence, feature, sector_average_rs, direction, strategy_source }) {
  const rs_value = feature && feature.relative_strength_vs_nifty != null
    ? parseFloat(feature.relative_strength_vs_nifty)
    : null;
  const confidence_score = clamp(parseFloat(confidence) || 0, 0, 100);
  const relative_strength_score = scoreRelativeStrength(rs_value, direction);
  const sector_alignment_score = scoreSectorAlignment(sector_average_rs, direction);
  const delivery_quality_score = scoreDeliveryQuality(feature);
  const setup_quality_score = scoreSetupQuality(feature, strategy_source, direction);

  const ranking_score = (
    confidence_score * RANKING_WEIGHTS.CONFIDENCE
    + relative_strength_score * RANKING_WEIGHTS.RELATIVE_STRENGTH
    + sector_alignment_score * RANKING_WEIGHTS.SECTOR_ALIGNMENT
    + delivery_quality_score * RANKING_WEIGHTS.DELIVERY_QUALITY
    + setup_quality_score * RANKING_WEIGHTS.SETUP_QUALITY
  );

  return {
    ranking_score: roundDecimal(ranking_score, 2),
    ranking_components: {
      confidence_score,
      relative_strength_score,
      sector_alignment_score,
      delivery_quality_score,
      setup_quality_score,
      relative_strength_vs_nifty: rs_value,
      sector_average_rs: sector_average_rs != null ? roundDecimal(parseFloat(sector_average_rs), 4) : null,
    },
  };
}

module.exports = {
  computeRankingScore,
  scoreRelativeStrength,
  scoreSectorAlignment,
  scoreDeliveryQuality,
  scoreSetupQuality,
};
