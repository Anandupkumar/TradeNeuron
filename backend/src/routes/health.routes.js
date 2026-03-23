const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

router.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      success: true,
      data: { status: 'ok', uptime: process.uptime() },
      error: null,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      data: null,
      error: 'Database connection unhealthy',
    });
  }
});

module.exports = router;
