const express = require('express');
const router = express.Router();
const tradeDecisionModel = require('../models/trade_decision.model');
const { decisionSchema } = require('../validations/signal.validation');
const { ValidationError, NotFoundError, AuthError } = require('../utils/errors');

router.post('/signals/:id/decision', async (req, res, next) => {
  try {
    const user_id = req.headers['x-user-id'];
    if (!user_id) throw new AuthError('X-User-Id header is required');

    const signal_id = parseInt(req.params.id, 10);
    if (isNaN(signal_id)) throw new ValidationError('Invalid signal ID');

    const { error, value } = decisionSchema.validate(req.body);
    if (error) throw new ValidationError(error.details[0].message);

    await tradeDecisionModel.upsertDecision({
      signal_id,
      user_identifier: user_id,
      decision: value.decision,
      notes: value.notes,
      actual_entry: value.actual_entry,
      actual_qty: value.actual_qty,
    });

    const saved = await tradeDecisionModel.getDecisionForSignal(signal_id, user_id);
    res.json({ success: true, data: saved, error: null });
  } catch (err) {
    next(err);
  }
});

router.get('/signals/:id/decision', async (req, res, next) => {
  try {
    const user_id = req.headers['x-user-id'];
    if (!user_id) throw new AuthError('X-User-Id header is required');

    const signal_id = parseInt(req.params.id, 10);
    if (isNaN(signal_id)) throw new ValidationError('Invalid signal ID');

    const decision = await tradeDecisionModel.getDecisionForSignal(signal_id, user_id);
    res.json({ success: true, data: decision, error: null });
  } catch (err) {
    next(err);
  }
});

router.get('/decisions', async (req, res, next) => {
  try {
    const user_id = req.headers['x-user-id'];
    if (!user_id) throw new AuthError('X-User-Id header is required');

    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const history = await tradeDecisionModel.getDecisionHistory(user_id, limit);
    res.json({ success: true, data: { decisions: history }, error: null });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
