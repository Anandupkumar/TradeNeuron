const express = require('express');
const router = express.Router();
const signalModel = require('../models/signal.model');
const rejectedSignalModel = require('../models/rejected_signal.model');
const confidenceCalibrationModel = require('../models/confidence_calibration.model');
const { pool } = require('../config/db');
const { listSignalsSchema } = require('../validations/signal.validation');
const { ValidationError } = require('../utils/errors');
const { getSector } = require('../utils/symbols.util');
const { isFavorite } = require('../services/favorites/favorite.service');
const { getOutcomeAnalytics } = require('../services/analytics/performance_analytics.service');

function parseSignalJson(s) {
  return {
    ...s,
    reasons: typeof s.reasons === 'string' ? JSON.parse(s.reasons) : s.reasons,
    explanation: typeof s.explanation === 'string' ? JSON.parse(s.explanation) : (s.explanation || null),
    confidence_breakdown: typeof s.confidence_breakdown === 'string' ? JSON.parse(s.confidence_breakdown) : (s.confidence_breakdown || null),
    ranking_components: typeof s.ranking_components === 'string' ? JSON.parse(s.ranking_components) : (s.ranking_components || null),
    exit_policy: typeof s.exit_policy === 'string' ? JSON.parse(s.exit_policy) : (s.exit_policy || null),
  };
}

router.get('/signals/funnel', async (req, res, next) => {
  try {
    const date = req.query.date || new Date().toISOString().slice(0, 10);

    const [[{ raw_total }]] = await pool.query(
      `SELECT COUNT(DISTINCT symbol) AS raw_total
       FROM rejected_signals WHERE date = ?`, [date]
    );

    const [gate_rows] = await pool.query(
      `SELECT reject_stage,
              COUNT(*) AS rejected_count
       FROM rejected_signals
       WHERE date = ?
       GROUP BY reject_stage
       ORDER BY FIELD(reject_stage,
         'FUNDAMENTAL_FILTER','SENTIMENT_FILTER','VWAP_FILTER',
         'PCR_FILTER','CONFIDENCE_GATE','RR_GATE',
         'SECTOR_GATE','ACTIVE_CAP','DUPLICATE','MERGED_RISK_ZERO','POSITION_SIZING'
       )`, [date]
    );

    const [[{ final_signals }]] = await pool.query(
      `SELECT COUNT(*) AS final_signals FROM signals WHERE date = ?`, [date]
    );

    const total_candidates = raw_total + final_signals;
    let survivors = total_candidates;
    const funnel = gate_rows.map((row) => {
      const input = survivors;
      survivors = survivors - row.rejected_count;
      const pass_rate = input > 0
        ? ((survivors / input) * 100).toFixed(1)
        : '100.0';
      return {
        gate: row.reject_stage,
        input,
        rejected: row.rejected_count,
        passed: survivors,
        pass_rate_pct: parseFloat(pass_rate),
      };
    });

    const over_strict = funnel
      .filter((g) => g.input >= 5 && g.pass_rate_pct < 40)
      .map((g) => g.gate);

    res.json({
      success: true,
      data: {
        date,
        total_candidates,
        final_signals,
        overall_conversion_pct: total_candidates > 0
          ? parseFloat(((final_signals / total_candidates) * 100).toFixed(1))
          : 0,
        funnel,
        warnings: over_strict.length > 0
          ? over_strict.map((g) => `${g} pass rate below 40% — consider widening threshold`)
          : [],
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/signals/rejected/distribution', async (req, res, next) => {
  try {
    const period_days = parseInt(req.query.period_days) || 30;
    if (period_days < 1 || period_days > 365) {
      throw new ValidationError('period_days must be between 1 and 365');
    }

    const distribution = await rejectedSignalModel.getDistribution(period_days);
    res.json({
      success: true,
      data: { period_days, ...distribution },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/signals/rejected', async (req, res, next) => {
  try {
    const date = req.query.date || null;
    const rows = await rejectedSignalModel.findByDate(date);
    res.json({ success: true, data: { rejected: rows }, error: null });
  } catch (err) {
    next(err);
  }
});

router.get('/signals', async (req, res, next) => {
  try {
    const { error, value } = listSignalsSchema.validate(req.query);
    if (error) throw new ValidationError(error.details[0].message);

    const user_id = req.headers['x-user-id'];

    const result = await signalModel.findAll({
      page: value.page,
      limit: value.limit,
      sort_by: value.sort_by,
      sort_order: value.sort_order,
      status: value.status,
      symbol: value.symbol,
      direction: value.direction,
      confidence_tier: value.confidence_tier,
      min_confidence: value.min_confidence,
      from_date: value.from_date,
      to_date: value.to_date,
      favorites_only: value.favorites_only,
      user_id,
    });

    const signals = await Promise.all(
      result.rows.map(async (s) => ({
        ...parseSignalJson(s),
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

router.get('/signals/calibration', async (req, res, next) => {
  try {
    const buckets = await confidenceCalibrationModel.getLatest();
    res.json({
      success: true,
      data: { buckets },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/signals/analytics/outcomes', async (req, res, next) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days || '90', 10), 1), 365);
    const analytics = await getOutcomeAnalytics(days);
    res.json({
      success: true,
      data: { days, ...analytics },
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
        ...parseSignalJson(s),
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
