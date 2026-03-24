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

    res.json({
      success: true,
      data: {
        status: 'ok',
        db: 'connected',
        uptime: process.uptime(),
        last_pipeline_run: last_run || null,
        active_signals_count,
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
      },
      error: 'Database connection unhealthy',
    });
  }
});

module.exports = router;
