const express = require('express');
const router = express.Router();
const {
  getPerformanceReport,
  buildPerformanceReportCsv,
} = require('../services/reports/performance_report.service');

router.get('/reports/performance', async (req, res, next) => {
  try {
    const report = await getPerformanceReport({
      from_date: req.query.from_date,
      to_date: req.query.to_date,
    });

    res.json({
      success: true,
      data: report,
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/reports/performance/export.csv', async (req, res, next) => {
  try {
    const report = await getPerformanceReport({
      from_date: req.query.from_date,
      to_date: req.query.to_date,
    });
    const csv = buildPerformanceReportCsv(report);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tradeneuron-performance-${report.range.from_date}-to-${report.range.to_date}.csv"`
    );
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
