const express = require('express');
const router = express.Router();
const signalModel = require('../models/signal.model');
const { listSignalsSchema } = require('../validations/signal.validation');
const { ValidationError } = require('../utils/errors');
const { getSector } = require('../utils/symbols.util');
const { isFavorite } = require('../services/favorites/favorite.service');

router.get('/signals', async (req, res, next) => {
  try {
    const { error, value } = listSignalsSchema.validate(req.query);
    if (error) throw new ValidationError(error.details[0].message);

    const result = await signalModel.findAll({
      page: value.page,
      limit: value.limit,
      sort_by: value.sort_by,
      sort_order: value.sort_order,
      status: value.status,
      symbol: value.symbol,
    });

    const user_id = req.headers['x-user-id'];
    const signals = await Promise.all(
      result.rows.map(async (s) => ({
        ...s,
        reasons: typeof s.reasons === 'string' ? JSON.parse(s.reasons) : s.reasons,
        sector: getSector(s.symbol),
        is_favorite: user_id ? await isFavorite(user_id, s.symbol) : undefined,
      }))
    );

    res.json({
      success: true,
      data: {
        signals,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          total_pages: Math.ceil(result.total / result.limit),
        },
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/signals/active', async (req, res, next) => {
  try {
    const active = await signalModel.findActive();
    const user_id = req.headers['x-user-id'];

    const signals = await Promise.all(
      active.map(async (s) => ({
        ...s,
        reasons: typeof s.reasons === 'string' ? JSON.parse(s.reasons) : s.reasons,
        sector: getSector(s.symbol),
        is_favorite: user_id ? await isFavorite(user_id, s.symbol) : undefined,
      }))
    );

    res.json({
      success: true,
      data: { signals },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
