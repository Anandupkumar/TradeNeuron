const express = require('express');
const router = express.Router();
const paperTradeModel = require('../models/paper_trade.model');
const { getPaperTradingSummary } = require('../services/paper_trading/paper_trade.service');

function parsePaperTrade(row) {
  return {
    ...row,
    exit_policy: typeof row.exit_policy === 'string' ? JSON.parse(row.exit_policy) : (row.exit_policy || null),
  };
}

router.get('/paper-trading/summary', async (req, res, next) => {
  try {
    const summary = await getPaperTradingSummary();

    res.json({
      success: true,
      data: summary,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/paper-trading/trades', async (req, res, next) => {
  try {
    const { page = 1, limit = 20, sort_by = 'entry_date', sort_order = 'DESC', status, symbol } = req.query;

    const result = await paperTradeModel.findAll({
      page: parseInt(page, 10),
      limit: Math.min(parseInt(limit, 10) || 20, 100),
      sort_by,
      sort_order,
      status,
      symbol,
    });

    res.json({
      success: true,
      data: {
        items: result.rows.map((row) => parsePaperTrade(row)),
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
