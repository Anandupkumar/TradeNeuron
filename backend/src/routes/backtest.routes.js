const express = require('express');
const router = express.Router();
const backtestResultModel = require('../models/backtest_result.model');

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
          latest_results.push({
            ...r,
            weight_config: typeof r.weight_config === 'string' ? JSON.parse(r.weight_config) : r.weight_config,
          });
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

    const results = result.rows.map((r) => ({
      ...r,
      weight_config: typeof r.weight_config === 'string' ? JSON.parse(r.weight_config) : r.weight_config,
    }));

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

module.exports = router;
