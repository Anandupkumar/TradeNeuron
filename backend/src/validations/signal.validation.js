const Joi = require('joi');

const listSignalsSchema = Joi.object({
  status: Joi.string().valid('ACTIVE', 'TARGET_HIT', 'SL_HIT', 'EXPIRED').optional(),
  min_confidence: Joi.number().min(0).max(100).optional(),
  symbol: Joi.string().max(20).optional(),
  from_date: Joi.date().iso().optional(),
  to_date: Joi.date().iso().optional(),
  favorites_only: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort_by: Joi.string().valid('date', 'confidence', 'risk_reward', 'symbol').default('date'),
  sort_order: Joi.string().valid('asc', 'desc', 'ASC', 'DESC').default('desc'),
});

module.exports = { listSignalsSchema };
