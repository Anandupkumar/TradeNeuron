const express = require('express');
const router = express.Router();
const backtestResultModel = require('../models/backtest_result.model');
const shadowValidationModel = require('../models/shadow_validation.model');
const { evaluatePromotionReadiness } = require('../services/analytics/shadow_validation.service');

function parseBacktestRow(row) {
  return {
    ...row,
    weight_config: typeof row.weight_config === 'string' ? JSON.parse(row.weight_config) : row.weight_config,
    exit_reason_distribution: typeof row.exit_reason_distribution === 'string'
      ? JSON.parse(row.exit_reason_distribution)
      : (row.exit_reason_distribution || null),
  };
}

router.get('/backtest/results', async (req, res, next) => {
  try {
    const { strategy, latest, page = 1, limit = 20, sort_by = 'run_date', sort_order = 'DESC' } = req.query;

    const strategy_name = strategy && strategy !== 'ALL' ? strategy : undefined;

    // When latest=true, return only the most recent run per strategy
    if (latest === 'true') {
      const result = await backtestResultModel.findAll({
        page: 1,
        limit: 100,
        sort_by: 'run_date',
        sort_order: 'DESC',
        strategy_name,
      });

      const seen = new Set();
      const latest_results = [];
      for (const r of result.rows) {
        if (!seen.has(r.strategy_name)) {
          seen.add(r.strategy_name);
          latest_results.push(parseBacktestRow(r));
        }
      }

      return res.json({
        success: true,
        data: { results: latest_results },
        error: null,
      });
    }

    const result = await backtestResultModel.findAll({
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10) || 20, 100),
      sort_by,
      sort_order,
      strategy_name,
    });

    const results = result.rows.map((r) => parseBacktestRow(r));

    res.json({
      success: true,
      data: {
        results,
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

router.get('/backtest/validation/shadow', async (req, res, next) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days || '30', 10), 1), 365);
    const runs = await shadowValidationModel.findRecent(days);
    const readiness = evaluatePromotionReadiness(runs);
    const parsed_runs = runs.map((row) => ({
      ...row,
      baseline_selection: typeof row.baseline_selection === 'string'
        ? JSON.parse(row.baseline_selection)
        : row.baseline_selection,
      improved_selection: typeof row.improved_selection === 'string'
        ? JSON.parse(row.improved_selection)
        : row.improved_selection,
      criteria_json: typeof row.criteria_json === 'string'
        ? JSON.parse(row.criteria_json)
        : row.criteria_json,
    }));

    res.json({
      success: true,
      data: { days, readiness, runs: parsed_runs },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
