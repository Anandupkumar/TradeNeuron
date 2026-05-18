import type { BacktestResult } from './backtest.types';
import type { PaperTradingSummary } from './paperTrade.types';

export interface ReportDateRange {
  from_date: string;
  to_date: string;
  days: number;
}

export interface ReportOverview {
  total_signals: number;
  closed_paper_trades: number;
  paper_win_rate_pct: number;
  paper_total_pnl_pct: number;
  pipeline_success_rate_pct: number;
  signal_conversion_pct: number;
  backtest_runs: number;
}

export interface PipelineRunSummary {
  id: number;
  run_date: string;
  started_at: string | null;
  completed_at: string | null;
  status: 'running' | 'completed' | 'failed';
  duration_ms: number | null;
  signals_generated: number | null;
  regime: string | null;
}

export interface PipelineReport {
  total_runs: number;
  completed_runs: number;
  failed_runs: number;
  running_runs: number;
  success_rate_pct: number;
  avg_duration_ms: number | null;
  max_duration_ms: number | null;
  signals_generated: number;
  recent_runs: PipelineRunSummary[];
}

export interface ReportBucket {
  key: string | number;
  total: number;
  wins: number;
  win_rate_pct: number;
}

export interface SignalOverviewGroup {
  strategy_source?: string | null;
  market_regime?: string | null;
  direction?: string | null;
  count: number;
  avg_confidence?: number | null;
}

export interface SignalReport {
  total_signals: number;
  active_signals: number;
  target_hits: number;
  sl_hits: number;
  expired_signals: number;
  resolved_signals: number;
  target_hit_rate_pct: number;
  avg_confidence: number | null;
  avg_risk_reward: number | null;
  by_strategy: SignalOverviewGroup[];
  by_direction: SignalOverviewGroup[];
  by_regime: SignalOverviewGroup[];
}

export interface RejectionStageReport {
  reject_stage: string;
  count: number;
  pct: number;
}

export interface SignalFunnelReport {
  total_candidates: number;
  final_signals: number;
  overall_conversion_pct: number;
  total_rejected: number;
  by_stage: RejectionStageReport[];
  by_symbol: Array<{ symbol: string; count: number }>;
  avg_raw_confidence_at_rejection: number | null;
  avg_raw_rr_at_rejection: number | null;
}

export interface SignalOutcomeReport {
  by_strategy: ReportBucket[];
  by_regime: ReportBucket[];
  by_sector: ReportBucket[];
  by_confidence_bucket: ReportBucket[];
  by_rs_bucket: ReportBucket[];
}

export interface StrategyPerformanceRow {
  strategy_name: string;
  scope_type: string;
  scope_value: string;
  trade_count: number;
  win_rate_pct: number;
  avg_pnl_pct: number;
  profit_factor: number | null;
  expectancy_pct: number;
  max_drawdown_pct: number;
  recommendation: string;
  recommendation_reason: string;
}

export interface StrategySnapshotRow extends StrategyPerformanceRow {
  snapshot_date: string;
  applied: number;
}

export interface BacktestReportSummary {
  total_runs: number;
  avg_win_rate_pct: number | null;
  avg_return_pct: number | null;
  avg_expectancy_pct: number | null;
  avg_max_drawdown_pct: number | null;
  avg_sharpe_ratio: number | null;
  avg_profit_factor: number | null;
  total_signals: number;
  by_strategy: Array<{
    strategy_name: string;
    runs: number;
    avg_win_rate_pct: number | null;
    avg_expectancy_pct: number | null;
    avg_profit_factor: number | null;
  }>;
  recent_results: BacktestResult[];
}

export interface PerformanceReport {
  range: ReportDateRange;
  generated_at_ist: string;
  overview: ReportOverview;
  pipeline: PipelineReport;
  signals: SignalReport;
  signal_funnel: SignalFunnelReport;
  signal_outcomes: SignalOutcomeReport;
  paper_trading: PaperTradingSummary & {
    winning_trades: number;
    losing_trades: number;
    best_trade_pct: number | null;
    worst_trade_pct: number | null;
    total_gross_pnl_inr: number | null;
    avg_mfe_pct: number | null;
    avg_mae_pct: number | null;
    avg_bars_held: number | null;
  };
  strategy_performance: {
    current: StrategyPerformanceRow[];
    snapshots: StrategySnapshotRow[];
  };
  backtest_summary: BacktestReportSummary;
}

export interface PerformanceReportParams {
  from_date?: string;
  to_date?: string;
}
