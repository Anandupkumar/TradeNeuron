const express = require('express');
const router = express.Router();
const candleModel = require('../models/candle.model');
const indicatorModel = require('../models/indicator.model');
const featureModel = require('../models/feature.model');
const signalModel = require('../models/signal.model');
const { NotFoundError } = require('../utils/errors');
const { getSector } = require('../utils/symbols.util');
const { isFavorite } = require('../services/favorites/favorite.service');
const config = require('../config/env');

function parseSignalJson(s) {
  if (!s) return null;
  return {
    ...s,
    reasons: typeof s.reasons === 'string' ? JSON.parse(s.reasons) : s.reasons,
    explanation: typeof s.explanation === 'string' ? JSON.parse(s.explanation) : (s.explanation || null),
    confidence_breakdown: typeof s.confidence_breakdown === 'string' ? JSON.parse(s.confidence_breakdown) : (s.confidence_breakdown || null),
  };
}

router.get('/stock/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params;

    const latest_candle = await candleModel.findLatestBySymbol(symbol);
    if (!latest_candle) {
      throw new NotFoundError(`No data found for symbol ${symbol}`);
    }

    const indicator = await indicatorModel.findLatestBySymbol(symbol);
    const feature = await featureModel.findLatestBySymbol(symbol);
    const active_signals = await signalModel.findActiveBySymbol(symbol);

    const user_id = req.headers['x-user-id'];
    const is_favorite_flag = user_id ? await isFavorite(user_id, symbol) : undefined;

    const raw_signal = active_signals.length > 0 ? active_signals[0] : null;
    const active_signal = raw_signal ? {
      ...parseSignalJson(raw_signal),
      sector: getSector(raw_signal.symbol),
    } : null;

    res.json({
      success: true,
      data: {
        symbol,
        sector: getSector(symbol),
        is_favorite: is_favorite_flag,
        latest_candle: {
          date: latest_candle.date,
          open: latest_candle.open,
          high: latest_candle.high,
          low: latest_candle.low,
          close: latest_candle.close,
          adjusted_close: latest_candle.adjusted_close,
          volume: latest_candle.volume,
        },
        indicators: indicator ? {
          ema_20: indicator.ema_20,
          ema_50: indicator.ema_50,
          ema_200: indicator.ema_200,
          rsi: indicator.rsi,
          macd_line: indicator.macd_line,
          macd_signal: indicator.macd_signal,
          macd_histogram: indicator.macd_histogram,
          atr: indicator.atr,
          volume_change: indicator.volume_change,
        } : null,
        features: feature ? {
          is_uptrend: !!feature.is_uptrend,
          rsi_zone: feature.rsi_zone,
          is_volume_spike: !!feature.is_volume_spike,
          is_breakout: !!feature.is_breakout,
          close_position: feature.close_position ?? null,
          ema50_slope: feature.ema50_slope ?? null,
          near_support: !!feature.near_support,
          is_liquid: !!feature.is_liquid,
          is_ranging: !!feature.is_ranging,
          z_score_20d: feature.z_score_20d ?? null,
          distance_from_52w_high_pct: feature.distance_from_52w_high_pct,
          relative_strength_vs_nifty: feature.relative_strength_vs_nifty,
          rvol: feature.rvol ?? null,
          volume_tier: feature.volume_tier ?? null,
          vwma: feature.vwma ?? feature.vwap ?? null,
          vwma_distance_pct: feature.vwma_distance_pct ?? feature.vwap_distance_pct ?? null,
          is_near_vwma: !!(feature.is_near_vwma ?? feature.is_near_vwap),
          ...(config.vwma_api_alias_enabled
            ? {
              vwap: feature.vwma ?? feature.vwap ?? null,
              vwap_distance_pct: feature.vwma_distance_pct ?? feature.vwap_distance_pct ?? null,
              is_near_vwap: !!(feature.is_near_vwma ?? feature.is_near_vwap),
            }
            : {}),
          is_high_delivery: !!feature.is_high_delivery,
          delivery_pct: feature.delivery_pct ?? null,
        } : null,
        active_signal,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
