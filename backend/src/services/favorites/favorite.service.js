const { logger } = require('../../middlewares/logger.middleware');
const { nifty_50_symbols } = require('../../utils/symbols.util');
const { ValidationError, NotFoundError, ConflictError } = require('../../utils/errors');
const favoriteModel = require('../../models/favorite.model');

async function addFavorite(user_identifier, symbol, notes) {
  if (!nifty_50_symbols.includes(symbol)) {
    throw new ValidationError(`Symbol ${symbol} is not a NIFTY 50 stock`);
  }

  const existing = await favoriteModel.findOne(user_identifier, symbol);
  if (existing) {
    throw new ConflictError(`${symbol} is already in your favorites`);
  }

  return favoriteModel.create(user_identifier, symbol, notes);
}

async function removeFavorite(user_identifier, symbol) {
  const removed = await favoriteModel.remove(user_identifier, symbol);
  if (!removed) {
    throw new NotFoundError(`${symbol} is not in your favorites`);
  }
  return { removed: true };
}

async function listFavorites(user_identifier) {
  return favoriteModel.findByUser(user_identifier);
}

async function isFavorite(user_identifier, symbol) {
  if (!user_identifier) return false;
  const row = await favoriteModel.findOne(user_identifier, symbol);
  return !!row;
}

module.exports = { addFavorite, removeFavorite, listFavorites, isFavorite };
