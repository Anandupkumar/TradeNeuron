const { SCORING_WEIGHTS, SHORT_SCORING_WEIGHTS, VOLUME_TIER_SCORES, SOFT_FILTER } = require('../../config/constants');
const indicatorModel = require('../../models/indicator.model');
const featureModel = require('../../models/feature.model');
const candleModel = require('../../models/candle.model');
const { clamp } = require('../../utils/math.util');
const { pool } = require('../../config/db');
const config = require('../../config/env');

let cached_adaptive_weights = null;
let adaptive_weights_loaded_at = 0;
const CACHE_TTL_MS = 60 * 60 * 1000;

async function loadAdaptiveWeights() {
  const now = Date.now();
  if (cached_adaptive_weights && (now - adaptive_weights_loaded_at) < CACHE_TTL_MS) {
    return cached_adaptive_weights;
  }
  try {
    const [rows] = await pool.query(
      `SELECT weight_trend, weight_rsi, weight_volume, weight_breakout
       FROM adaptive_thresholds
       WHERE symbol = '_GLOBAL_' AND weight_trend IS NOT NULL
       ORDER BY date DESC LIMIT 1`
    );
    if (rows.length > 0) {
      const r = rows[0];
      cached_adaptive_weights = {
        trend: parseFloat(r.weight_trend),
        rsi: parseFloat(r.weight_rsi),
        volume: parseFloat(r.weight_volume),
        breakout: parseFloat(r.weight_breakout),
      };
    } else {
      cached_adaptive_weights = null;
    }
  } catch {
    cached_adaptive_weights = null;
  }
  adaptive_weights_loaded_at = now;
  return cached_adaptive_weights;
}

async function _scoreInternal(symbol, date, direction = 'LONG') {
  const feature = await featureModel.findBySymbolAndDate(symbol, date);
  const indicator = await indicatorModel.findBySymbolAndDate(symbol, date);

  if (!feature || !indicator) {
    return { score: 0, breakdown: null, feature, indicator };
  }

  const adaptive = await loadAdaptiveWeights();
  const is_short = direction === 'SHORT';

  let technical = 0;
  let momentum = 0;
  let volume = 0;
  let quality = 0;

  const is_uptrend = feature.is_uptrend === 1 || feature.is_uptrend === true;
  const ema_20 = indicator.ema_20 != null ? parseFloat(indicator.ema_20) : null;
  const ema_50 = indicator.ema_50 != null ? parseFloat(indicator.ema_50) : null;
  const ema50_slope = feature.ema50_slope != null ? parseFloat(feature.ema50_slope) : null;
  const is_breakout = feature.is_breakout === 1 || feature.is_breakout === true;
  const close_position = feature.close_position != null ? parseFloat(feature.close_position) : null;
  const is_high_delivery = feature.is_high_delivery === 1 || feature.is_high_delivery === true;

  if (is_short) {
    const w_trend = adaptive ? adaptive.trend : SHORT_SCORING_WEIGHTS.TREND;
    const w_rsi = adaptive ? adaptive.rsi : SHORT_SCORING_WEIGHTS.RSI_OVERBOUGHT;
    const w_breakdown = adaptive ? adaptive.breakout : SHORT_SCORING_WEIGHTS.BREAKDOWN;

    const is_downtrend = !is_uptrend && ema_20 != null && ema_50 != null && ema_20 < ema_50;
    if (is_downtrend) {
      let trend_score = w_trend;
      if (ema50_slope != null && ema50_slope >= 0) {
        trend_score = Math.max(0, trend_score - SOFT_FILTER.TREND_SLOPE_PENALTY);
      }
      technical += trend_score;
    }

    if (feature.rsi_zone === 'OVERBOUGHT') {
      momentum += w_rsi;
    }

    const is_breakdown = !is_breakout && close_position != null && close_position < SOFT_FILTER.BREAKDOWN_CLOSE_POSITION_THRESHOLD;
    if (is_breakdown) {
      technical += w_breakdown;
    }

    if (is_high_delivery) {
      quality += 6;
    }
    if (ema50_slope != null && ema50_slope < -0.5) {
      quality += 3;
    }
    const is_near_vw_short = (feature.is_near_vwma === 1 || feature.is_near_vwma === true)
      || (feature.is_near_vwap === 1 || feature.is_near_vwap === true);
    if (is_near_vw_short) {
      quality += 3;
    }
    quality = Math.min(quality, 12);

    const ema_200_s = indicator.ema_200 != null ? parseFloat(indicator.ema_200) : null;
    const candle_s = await candleModel.findBySymbolAndDate(symbol, date);
    const close_s = candle_s ? parseFloat(candle_s.adjusted_close) : null;
    if (ema_200_s != null && close_s != null && close_s < ema_200_s) {
      quality += 5;
    }
  } else {
    const w_trend = adaptive ? adaptive.trend : SCORING_WEIGHTS.TREND;
    const w_rsi = adaptive ? adaptive.rsi : SCORING_WEIGHTS.RSI_PULLBACK;
    const w_breakout = adaptive ? adaptive.breakout : SCORING_WEIGHTS.BREAKOUT;

    if (is_uptrend && ema_20 != null && ema_50 != null && ema_20 > ema_50) {
      let trend_score = w_trend;
      if (ema50_slope != null && ema50_slope <= 0) {
        trend_score = Math.max(0, trend_score - SOFT_FILTER.TREND_SLOPE_PENALTY);
      }
      technical += trend_score;
    }

    if (feature.rsi_zone === 'PULLBACK') {
      momentum += w_rsi;
    }

    if (is_breakout) {
      if (close_position != null && close_position < SOFT_FILTER.BREAKOUT_CLOSE_POSITION_HARD) {
        // Weak breakout — no points
      } else if (close_position != null && close_position < SOFT_FILTER.BREAKOUT_CLOSE_POSITION_SOFT) {
        technical += Math.max(0, w_breakout - SOFT_FILTER.BREAKOUT_SOFT_PENALTY);
      } else {
        technical += w_breakout;
      }
    }

    if (is_high_delivery && is_breakout) {
      quality += 10;
    }

    const is_near_vw_long = (feature.is_near_vwma === 1 || feature.is_near_vwma === true)
      || (feature.is_near_vwap === 1 || feature.is_near_vwap === true);
    if (is_near_vw_long) {
      quality += config.vwap_score_near;
    }

    const ema_200 = indicator.ema_200 != null ? parseFloat(indicator.ema_200) : null;
    const candle_row = await candleModel.findBySymbolAndDate(symbol, date);
    const close_px = candle_row ? parseFloat(candle_row.adjusted_close) : null;
    if (ema_200 != null && close_px != null && close_px > ema_200) {
      quality += 5;
    }
  }

  const volume_tier = feature.volume_tier || 'normal';
  if (adaptive) {
    const tier_multiplier = { extreme: 1.0, high: 0.67, elevated: 0.33, normal: 0 };
    volume += adaptive.volume * (tier_multiplier[volume_tier] || 0);
  } else {
    volume += VOLUME_TIER_SCORES[volume_tier] || 0;
  }

  const raw_score = technical + momentum + volume + quality;
  const score = clamp(raw_score, 0, 100);

  const breakdown = {
    technical: Math.round(technical * 100) / 100,
    momentum: Math.round(momentum * 100) / 100,
    volume: Math.round(volume * 100) / 100,
    quality: Math.round(quality * 100) / 100,
  };

  return { score, breakdown, feature, indicator };
}

async function calculateScore(symbol, date, direction = 'LONG') {
  const { score } = await _scoreInternal(symbol, date, direction);
  return score;
}

async function calculateScoreWithBreakdown(symbol, date, direction = 'LONG') {
  const { score, breakdown, feature, indicator } = await _scoreInternal(symbol, date, direction);
  return { score, breakdown, feature, indicator };
}

function buildExplanations(feature, indicator, regime, sentiment, direction = 'LONG') {
  const sentences = [];

  if (!feature || !indicator) {
    sentences.push('Insufficient data to generate a detailed explanation.');
    return sentences;
  }

  if (regime) {
    sentences.push(`Market regime is ${regime}.`);
  }

  const is_uptrend = feature.is_uptrend === 1 || feature.is_uptrend === true;
  const ema_20 = indicator.ema_20 != null ? parseFloat(indicator.ema_20) : null;
  const ema_50 = indicator.ema_50 != null ? parseFloat(indicator.ema_50) : null;
  const ema50_slope = feature.ema50_slope != null ? parseFloat(feature.ema50_slope) : null;
  const is_breakout = feature.is_breakout === 1 || feature.is_breakout === true;
  const close_position = feature.close_position != null ? parseFloat(feature.close_position) : null;
  const is_high_delivery = feature.is_high_delivery === 1 || feature.is_high_delivery === true;
  const is_short = direction === 'SHORT';

  if (is_short) {
    const is_downtrend = !is_uptrend && ema_20 != null && ema_50 != null && ema_20 < ema_50;
    if (is_downtrend) {
      if (ema50_slope != null && ema50_slope >= 0) {
        sentences.push(`Stock is in a downtrend with EMA 20 (${ema_20.toFixed(2)}) below EMA 50 (${ema_50.toFixed(2)}), but EMA 50 slope is flat/rising (${ema50_slope.toFixed(2)}) — trend score reduced.`);
      } else {
        sentences.push(`Stock is in a downtrend with EMA 20 (${ema_20.toFixed(2)}) below EMA 50 (${ema_50.toFixed(2)}), adding trend alignment points for short.`);
      }
    } else {
      sentences.push('Stock is not in a confirmed downtrend — no trend alignment points awarded for short.');
    }

    if (feature.rsi_zone === 'OVERBOUGHT') {
      const rsi_val = indicator.rsi_14 != null ? parseFloat(indicator.rsi_14).toFixed(1) : '?';
      sentences.push(`RSI is in the overbought zone (${rsi_val}), indicating a favorable short entry on a bounce.`);
    } else {
      sentences.push(`RSI zone is ${feature.rsi_zone || 'NEUTRAL'} — no momentum bonus for short.`);
    }

    const is_breakdown = !is_breakout && close_position != null && close_position < SOFT_FILTER.BREAKDOWN_CLOSE_POSITION_THRESHOLD;
    if (is_breakdown) {
      sentences.push(`Candle closed near its low (position: ${close_position.toFixed(2)}), confirming breakdown pressure — earning breakdown points.`);
    } else if (!is_breakout && close_position != null) {
      sentences.push(`Candle close position (${close_position.toFixed(2)}) not low enough for breakdown confirmation.`);
    }

    if (is_high_delivery) {
      sentences.push('High delivery adds up to +6 short quality (capped with other quality factors at +12 before EMA200 boost).');
    }
    if (ema50_slope != null && ema50_slope < -0.5) {
      sentences.push('EMA 50 slope strongly negative — short quality +3 (within cap).');
    }
    const is_near_vw_s = (feature.is_near_vwma === 1 || feature.is_near_vwma === true)
      || (feature.is_near_vwap === 1 || feature.is_near_vwap === true);
    if (is_near_vw_s) {
      sentences.push('Price is near rolling VWMA — short quality +3 (within cap).');
    }
  } else {
    if (is_uptrend && ema_20 != null && ema_50 != null && ema_20 > ema_50) {
      if (ema50_slope != null && ema50_slope <= 0) {
        sentences.push(`Stock is in an uptrend with EMA 20 (${ema_20.toFixed(2)}) above EMA 50 (${ema_50.toFixed(2)}), but EMA 50 slope is flat/declining (${ema50_slope.toFixed(2)}) — trend score reduced.`);
      } else {
        sentences.push(`Stock is in an uptrend with EMA 20 (${ema_20.toFixed(2)}) above EMA 50 (${ema_50.toFixed(2)}), adding trend alignment points.`);
      }
    } else if (is_uptrend) {
      sentences.push('Stock is in an uptrend but EMA 20/50 crossover not confirmed.');
    } else {
      sentences.push('Stock is not in an uptrend — no trend alignment points awarded.');
    }

    if (feature.rsi_zone === 'PULLBACK') {
      const rsi_val = indicator.rsi_14 != null ? parseFloat(indicator.rsi_14).toFixed(1) : '?';
      sentences.push(`RSI is in the pullback zone (${rsi_val}), indicating a favorable entry point.`);
    } else {
      sentences.push(`RSI zone is ${feature.rsi_zone || 'NEUTRAL'} — no momentum bonus.`);
    }

    if (is_breakout) {
      if (close_position != null && close_position < SOFT_FILTER.BREAKOUT_CLOSE_POSITION_HARD) {
        sentences.push(`Price is breaking out but close position is weak (${close_position.toFixed(2)}) — no breakout points awarded.`);
      } else if (close_position != null && close_position < SOFT_FILTER.BREAKOUT_CLOSE_POSITION_SOFT) {
        sentences.push(`Price is breaking out with moderate close position (${close_position.toFixed(2)}) — breakout points reduced.`);
      } else {
        sentences.push('Price is breaking out above resistance, earning full breakout points.');
      }
    }

    if (is_high_delivery && is_breakout) {
      sentences.push('High delivery percentage on a breakout day adds a quality bonus (+10).');
    }

    const is_near_vw_l = (feature.is_near_vwma === 1 || feature.is_near_vwma === true)
      || (feature.is_near_vwap === 1 || feature.is_near_vwap === true);
    if (is_near_vw_l) {
      sentences.push(`Price is near rolling VWMA — ideal entry quality bonus (+${config.vwap_score_near}).`);
    }
  }

  const volume_tier = feature.volume_tier || 'normal';
  if (volume_tier !== 'normal') {
    const rvol = feature.rvol != null ? parseFloat(feature.rvol).toFixed(2) : '?';
    sentences.push(`Volume tier is ${volume_tier.toUpperCase()} (RVOL: ${rvol}x), contributing volume points.`);
  } else {
    sentences.push('Volume is at normal levels — no volume bonus.');
  }

  if (sentiment) {
    if (sentiment === 'NEGATIVE') {
      sentences.push('Negative news sentiment was detected — signal was subject to sentiment filtering.');
    } else if (sentiment === 'POSITIVE') {
      sentences.push('Positive news sentiment supports the trade thesis.');
    } else {
      sentences.push('News sentiment is neutral.');
    }
  }

  return sentences;
}

function mergeScores(scores) {
  const total = scores.reduce((sum, s) => sum + s, 0);
  return Math.min(total, 100);
}

module.exports = { calculateScore, calculateScoreWithBreakdown, buildExplanations, mergeScores };
