const express = require('express');
const router = express.Router();
const strategyConfigModel = require('../models/strategy_config.model');

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

module.exports = router;
