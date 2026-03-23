import type { BacktestResult } from '../../types/backtest.types';

export const mockBacktestResult: BacktestResult = {
  strategy_name: 'TREND_PULLBACK',
  run_date: '2025-01-15',
  test_period: '2024-07-01 to 2025-01-15',
  total_signals: 120,
  wins: 72,
  losses: 40,
  neutral: 8,
  win_rate_pct: 60.0,
  avg_return_pct: 1.8,
  max_drawdown_pct: -12.5,
  sharpe_ratio: 1.45,
  profit_factor: 1.92,
  avg_holding_days: 6.3,
};

export const mockBacktestResults: BacktestResult[] = [
  mockBacktestResult,
  {
    strategy_name: 'BREAKOUT',
    run_date: '2025-01-15',
    test_period: '2024-07-01 to 2025-01-15',
    total_signals: 85,
    wins: 45,
    losses: 35,
    neutral: 5,
    win_rate_pct: 52.9,
    avg_return_pct: 2.5,
    max_drawdown_pct: -15.0,
    sharpe_ratio: 1.1,
    profit_factor: 1.55,
    avg_holding_days: 8.1,
  },
];
