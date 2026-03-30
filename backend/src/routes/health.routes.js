const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');

    const [[{ count: active_signals_count }]] = await pool.query(
      `SELECT COUNT(*) as count FROM signals WHERE status = 'ACTIVE'`
    );

    const [[{ last_run }]] = await pool.query(
      `SELECT MAX(created_at) as last_run FROM signals`
    );

    const [[{ count: weekly_signal_count }]] = await pool.query(
      `SELECT COUNT(*) as count FROM signals WHERE YEARWEEK(date, 1) = YEARWEEK(CURDATE(), 1)`
    );

    let market_regime = null;
    try {
      const { checkMarketRegime } = require('../services/strategies/index');
      const { regime } = await checkMarketRegime();
      market_regime = regime;
    } catch (_) {
      // fail-open: regime is informational only
    }

    res.json({
      success: true,
      data: {
        status: 'ok',
        db: 'connected',
        uptime: process.uptime(),
        last_pipeline_run: last_run || null,
        active_signals_count,
        weekly_signal_count,
        market_regime,
      },
      error: null,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      data: {
        status: 'degraded',
        db: 'disconnected',
        last_pipeline_run: null,
        active_signals_count: 0,
        weekly_signal_count: 0,
        market_regime: null,
      },
      error: 'Database connection unhealthy',
    });
  }
});

module.exports = router;
