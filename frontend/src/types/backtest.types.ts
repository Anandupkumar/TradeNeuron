export interface BacktestResult {
  strategy_name: string;
  run_date: string;
  test_period: string;
  total_signals: number;
  wins: number;
  losses: number;
  neutral: number;
  win_rate_pct: number;
  avg_return_pct: number;
  max_drawdown_pct: number;
  sharpe_ratio: number | null;
  profit_factor: number | null;
  avg_holding_days: number | null;
  expectancy_pct?: number | null;
  avg_mfe_pct?: number | null;
  avg_mae_pct?: number | null;
  gap_open_losses?: number | null;
  avg_entry_gap_pct?: number | null;
  exit_reason_distribution?: Record<string, number> | null;
}
