const {
  validateDateRange,
  buildPerformanceReportCsv,
} = require('../../../src/services/reports/performance_report.service');

describe('Performance Report Service', () => {
  test('should validate an explicit date range', () => {
    const range = validateDateRange({
      from_date: '2026-05-01',
      to_date: '2026-05-10',
    });

    expect(range).toEqual({
      from_date: '2026-05-01',
      to_date: '2026-05-10',
      days: 10,
    });
  });

  test('should reject inverted date ranges', () => {
    expect(() => validateDateRange({
      from_date: '2026-05-10',
      to_date: '2026-05-01',
    })).toThrow('from_date must be on or before to_date');
  });

  test('should build CSV with overview and strategy sections', () => {
    const csv = buildPerformanceReportCsv({
      range: { from_date: '2026-05-01', to_date: '2026-05-30', days: 30 },
      overview: {
        total_signals: 12,
        closed_paper_trades: 8,
        paper_win_rate_pct: 62.5,
        paper_total_pnl_pct: 4.25,
        pipeline_success_rate_pct: 100,
        signal_conversion_pct: 15,
      },
      pipeline: { total_runs: 10, completed_runs: 10, failed_runs: 0 },
      signals: {
        total_signals: 12,
        active_signals: 3,
        target_hits: 5,
        sl_hits: 2,
        expired_signals: 1,
        resolved_signals: 8,
        target_hit_rate_pct: 60,
      },
      paper_trading: { avg_pnl_pct: 0.5, max_drawdown_pct: 1.2 },
      backtest_summary: { total_runs: 2, avg_win_rate_pct: 58 },
      strategy_performance: {
        current: [{
          strategy_name: 'trend_pullback',
          scope_type: 'GLOBAL',
          scope_value: 'ALL',
          trade_count: 5,
          win_rate_pct: 60,
          expectancy_pct: 0.8,
          recommendation: 'KEEP',
        }],
      },
    });

    expect(csv).toContain('section,metric,value');
    expect(csv).toContain('overview,total_signals,12');
    expect(csv).toContain('signals,target_hits,5');
    expect(csv).toContain('signals,sl_hits,2');
    expect(csv).toContain('signals,expired_signals,1');
    expect(csv).toContain('trend_pullback,GLOBAL,ALL,5,60,0.8,KEEP');
  });
});
