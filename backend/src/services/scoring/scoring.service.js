const { SCORING_WEIGHTS, VOLUME_TIER_SCORES, SOFT_FILTER } = require('../../config/constants');
const indicatorModel = require('../../models/indicator.model');
const featureModel = require('../../models/feature.model');
const { clamp } = require('../../utils/math.util');
const { pool } = require('../../config/db');

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

async function _scoreInternal(symbol, date) {
  const feature = await featureModel.findBySymbolAndDate(symbol, date);
  const indicator = await indicatorModel.findBySymbolAndDate(symbol, date);

  if (!feature || !indicator) {
    return { score: 0, breakdown: null, feature, indicator };
  }

  const adaptive = await loadAdaptiveWeights();

  const w_trend = adaptive ? adaptive.trend : SCORING_WEIGHTS.TREND;
  const w_rsi = adaptive ? adaptive.rsi : SCORING_WEIGHTS.RSI_PULLBACK;
  const w_breakout = adaptive ? adaptive.breakout : SCORING_WEIGHTS.BREAKOUT;

  let technical = 0;
  let momentum = 0;
  let volume = 0;
  let quality = 0;

  const is_uptrend = feature.is_uptrend === 1 || feature.is_uptrend === true;
  const ema_20 = indicator.ema_20 != null ? parseFloat(indicator.ema_20) : null;
  const ema_50 = indicator.ema_50 != null ? parseFloat(indicator.ema_50) : null;

  if (is_uptrend && ema_20 != null && ema_50 != null && ema_20 > ema_50) {
    let trend_score = w_trend;
    // Improvement 3: penalize flat/declining EMA50 slope
    const ema50_slope = feature.ema50_slope != null ? parseFloat(feature.ema50_slope) : null;
    if (ema50_slope != null && ema50_slope <= 0) {
      trend_score = Math.max(0, trend_score - SOFT_FILTER.TREND_SLOPE_PENALTY);
    }
    technical += trend_score;
  }

  if (feature.rsi_zone === 'PULLBACK') {
    momentum += w_rsi;
  }

  const volume_tier = feature.volume_tier || 'normal';
  if (adaptive) {
    const tier_multiplier = { extreme: 1.0, high: 0.67, elevated: 0.33, normal: 0 };
    volume += adaptive.volume * (tier_multiplier[volume_tier] || 0);
  } else {
    volume += VOLUME_TIER_SCORES[volume_tier] || 0;
  }

  const is_breakout = feature.is_breakout === 1 || feature.is_breakout === true;
  if (is_breakout) {
    // Improvement 1: soft breakout confirmation via close_position
    const close_position = feature.close_position != null ? parseFloat(feature.close_position) : null;
    if (close_position != null && close_position < SOFT_FILTER.BREAKOUT_CLOSE_POSITION_HARD) {
      // Weak breakout — no points awarded
    } else if (close_position != null && close_position < SOFT_FILTER.BREAKOUT_CLOSE_POSITION_SOFT) {
      technical += Math.max(0, w_breakout - SOFT_FILTER.BREAKOUT_SOFT_PENALTY);
    } else {
      technical += w_breakout;
    }
  }

  const is_high_delivery = feature.is_high_delivery === 1 || feature.is_high_delivery === true;
  if (is_high_delivery && is_breakout) {
    quality += 10;
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

async function calculateScore(symbol, date) {
  const { score } = await _scoreInternal(symbol, date);
  return score;
}

async function calculateScoreWithBreakdown(symbol, date) {
  const { score, breakdown, feature, indicator } = await _scoreInternal(symbol, date);
  return { score, breakdown, feature, indicator };
}

function buildExplanations(feature, indicator, regime, sentiment) {
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

  if (is_uptrend && ema_20 != null && ema_50 != null && ema_20 > ema_50) {
    const ema50_slope = feature.ema50_slope != null ? parseFloat(feature.ema50_slope) : null;
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

  const volume_tier = feature.volume_tier || 'normal';
  if (volume_tier !== 'normal') {
    const rvol = feature.rvol != null ? parseFloat(feature.rvol).toFixed(2) : '?';
    sentences.push(`Volume tier is ${volume_tier.toUpperCase()} (RVOL: ${rvol}x), contributing volume points.`);
  } else {
    sentences.push('Volume is at normal levels — no volume bonus.');
  }

  const is_breakout = feature.is_breakout === 1 || feature.is_breakout === true;
  if (is_breakout) {
    const close_position = feature.close_position != null ? parseFloat(feature.close_position) : null;
    if (close_position != null && close_position < SOFT_FILTER.BREAKOUT_CLOSE_POSITION_HARD) {
      sentences.push(`Price is breaking out but close position is weak (${close_position.toFixed(2)}) — no breakout points awarded.`);
    } else if (close_position != null && close_position < SOFT_FILTER.BREAKOUT_CLOSE_POSITION_SOFT) {
      sentences.push(`Price is breaking out with moderate close position (${close_position.toFixed(2)}) — breakout points reduced.`);
    } else {
      sentences.push('Price is breaking out above resistance, earning full breakout points.');
    }
  }

  const is_high_delivery = feature.is_high_delivery === 1 || feature.is_high_delivery === true;
  if (is_high_delivery && is_breakout) {
    sentences.push('High delivery percentage on a breakout day adds a quality bonus (+10).');
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
