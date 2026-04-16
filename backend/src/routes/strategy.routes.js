const express = require('express');
const router = express.Router();
const strategyConfigModel = require('../models/strategy_config.model');
const strategyPerformanceSnapshotModel = require('../models/strategy_performance_snapshot.model');
const { getStrategyPerformanceSlices } = require('../services/analytics/performance_analytics.service');

router.get('/strategies', async (req, res) => {
  try {
    const strategies = await strategyConfigModel.getAll();
    res.json({
      success: true,
      data: { strategies },
      error: null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: error.message,
    });
  }
});

router.get('/strategies/performance', async (req, res, next) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days || '90', 10), 1), 365);
    const current = await getStrategyPerformanceSlices(days);
    const snapshots = await strategyPerformanceSnapshotModel.findRecent(days);
    res.json({
      success: true,
      data: {
        days,
        current,
        snapshots,
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
