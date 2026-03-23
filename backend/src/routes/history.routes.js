const express = require('express');
const router = express.Router();
const candleModel = require('../models/candle.model');
const indicatorModel = require('../models/indicator.model');
const { historyQuerySchema } = require('../validations/stock.validation');
const { ValidationError, NotFoundError } = require('../utils/errors');
const { formatDate, getDateNDaysAgo } = require('../utils/date.util');

router.get('/history/:symbol', async (req, res, next) => {
  try {
    const { symbol } = req.params;
    const { error, value } = historyQuerySchema.validate(req.query);
    if (error) throw new ValidationError(error.details[0].message);

    const from_date = value.from_date ? formatDate(value.from_date) : formatDate(getDateNDaysAgo(180));
    const to_date = value.to_date ? formatDate(value.to_date) : formatDate(new Date());

    const candles = await candleModel.findBySymbolAndDateRange(symbol, from_date, to_date);
    if (candles.length === 0) {
      throw new NotFoundError(`No history found for symbol ${symbol}`);
    }

    let indicator_map = {};
    if (value.include_indicators) {
      const indicators = await indicatorModel.findBySymbolAndDateRange(symbol, from_date, to_date);
      for (const ind of indicators) {
        indicator_map[formatDate(ind.date)] = ind;
      }
    }

    const data_candles = candles.map((c) => {
      const row = {
        date: c.date,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        adjusted_close: c.adjusted_close,
        volume: c.volume,
      };

      if (value.include_indicators) {
        const ind = indicator_map[formatDate(c.date)];
        row.indicators = ind ? {
          ema_20: ind.ema_20,
          ema_50: ind.ema_50,
          ema_200: ind.ema_200,
          rsi: ind.rsi,
          macd_line: ind.macd_line,
          macd_signal: ind.macd_signal,
          macd_histogram: ind.macd_histogram,
          atr: ind.atr,
          volume_change: ind.volume_change,
        } : null;
      }

      return row;
    });

    res.json({
      success: true,
      data: {
        symbol,
        candles: data_candles,
        total: data_candles.length,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
