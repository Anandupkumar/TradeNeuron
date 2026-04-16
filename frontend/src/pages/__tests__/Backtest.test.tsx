import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import BacktestPage from '../Backtest';
import { renderWithProviders } from '@/test/test-utils';
import { useBacktestResults } from '../../hooks/useBacktest';

vi.mock('../../hooks/useBacktest', () => ({
  useBacktestResults: vi.fn(),
}));

vi.mock('../../components/backtest/WalkForwardChart', () => ({
  WalkForwardChart: () => {
    throw new Error('walk-forward render failed');
  },
}));

const mock_results = [
  {
    strategy_name: 'TREND_PULLBACK',
    run_date: '2026-04-10',
    test_period: '2025-Q4',
    total_signals: 24,
    wins: 14,
    losses: 8,
    neutral: 2,
    win_rate_pct: 58.3,
    avg_return_pct: 2.4,
    max_drawdown_pct: -6.5,
    sharpe_ratio: 1.4,
    profit_factor: 1.8,
    avg_holding_days: 7.2,
  },
];

describe('BacktestPage', () => {
  beforeEach(() => {
    vi.mocked(useBacktestResults).mockImplementation((params?: { strategy?: string; latest?: boolean }) => (
      {
        data: { results: mock_results },
        isLoading: false,
        isError: false,
        refetch: vi.fn(),
        params,
      } as never
    ));
  });

  it('keeps the page alive when the walk-forward chart throws', () => {
    renderWithProviders(<BacktestPage />, { route: '/backtest' });

    expect(screen.getByText(/metrics comparison/i)).toBeInTheDocument();
    expect(screen.getByText(/chart unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /walk-forward analysis/i })).toBeInTheDocument();
  });
});
