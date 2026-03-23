const Joi = require('joi');

const symbolParamSchema = Joi.object({
  symbol: Joi.string().max(20).required(),
});

const historyQuerySchema = Joi.object({
  from_date: Joi.date().iso().optional(),
  to_date: Joi.date().iso().optional(),
  include_indicators: Joi.boolean().optional().default(false),
});

module.exports = { symbolParamSchema, historyQuerySchema };
