const Joi = require('joi');
const { nifty_50_symbols } = require('../utils/symbols.util');

const addFavoriteSchema = Joi.object({
  symbol: Joi.string().required().valid(...nifty_50_symbols),
  notes: Joi.string().max(500).allow('', null).optional(),
});

module.exports = { addFavoriteSchema };
