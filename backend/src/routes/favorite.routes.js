const express = require('express');
const router = express.Router();
const { extractUserId } = require('../middlewares/auth.middleware');
const { addFavoriteSchema } = require('../validations/favorite.validation');
const { ValidationError } = require('../utils/errors');
const favoriteService = require('../services/favorites/favorite.service');

router.use('/favorites', extractUserId);

router.post('/favorites', async (req, res, next) => {
  try {
    const { error, value } = addFavoriteSchema.validate(req.body);
    if (error) throw new ValidationError(error.details[0].message);

    const result = await favoriteService.addFavorite(req.user_id, value.symbol, value.notes);

    res.status(201).json({
      success: true,
      data: result,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/favorites/:symbol', async (req, res, next) => {
  try {
    const result = await favoriteService.removeFavorite(req.user_id, req.params.symbol);

    res.json({
      success: true,
      data: result,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/favorites', async (req, res, next) => {
  try {
    const favorites = await favoriteService.listFavorites(req.user_id);

    res.json({
      success: true,
      data: { favorites },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
