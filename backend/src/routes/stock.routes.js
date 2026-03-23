const express = require('express');
const router = express.Router();
const candleModel = require('../models/candle.model');
const indicatorModel = require('../models/indicator.model');
const featureModel = require('../models/feature.model');
const signalModel = require('../models/signal.model');
const { NotFoundError } = require('../utils/errors');
const { getSector } = require('../utils/symbols.util');
const { isFavorite } = require('../services/favorites/favorite.service');

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
          near_support: !!feature.near_support,
          is_liquid: !!feature.is_liquid,
          distance_from_52w_high_pct: feature.distance_from_52w_high_pct,
          relative_strength_vs_nifty: feature.relative_strength_vs_nifty,
        } : null,
        active_signal: active_signals.length > 0 ? active_signals[0] : null,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
