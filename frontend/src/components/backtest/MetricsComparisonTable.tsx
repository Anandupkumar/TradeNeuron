import { cn } from '@/lib/utils';
import { DataTable } from '../common/DataTable';
import { formatPct, formatRR, formatDate } from '../../utils/format';
import type { BacktestResult } from '../../types';

interface MetricsComparisonTableProps {
  results: BacktestResult[];
}

const columns = [
  {
    key: 'strategy_name',
    header: 'Strategy',
    sortable: true,
    render: (r: BacktestResult) => (
      <span className="font-medium">{r.strategy_name.split('_').join(' ')}</span>
    ),
  },
  {
    key: 'run_date',
    header: 'Run Date',
    sortable: true,
    render: (r: BacktestResult) => formatDate(r.run_date),
  },
  {
    key: 'test_period',
    header: 'Test Period',
    render: (r: BacktestResult) => <span className="text-xs">{r.test_period}</span>,
  },
  {
    key: 'total_signals',
    header: 'Signals',
    sortable: true,
    render: (r: BacktestResult) => r.total_signals,
  },
  {
    key: 'win_rate_pct',
    header: 'Win Rate',
    sortable: true,
    render: (r: BacktestResult) => (
      <span className={cn(r.win_rate_pct >= 50 ? 'text-emerald-400' : 'text-red-400')}>
        {formatPct(r.win_rate_pct)}
      </span>
    ),
  },
  {
    key: 'avg_return_pct',
    header: 'Avg Return',
    sortable: true,
    render: (r: BacktestResult) => (
      <span className={cn(r.avg_return_pct >= 0 ? 'text-emerald-400' : 'text-red-400')}>
        {formatPct(r.avg_return_pct, true)}
      </span>
    ),
  },
  {
    key: 'max_drawdown_pct',
    header: 'Max Drawdown',
    sortable: true,
    render: (r: BacktestResult) => (
      <span className="text-red-400">{formatPct(r.max_drawdown_pct, true)}</span>
    ),
  },
  {
    key: 'sharpe_ratio',
    header: 'Sharpe',
    sortable: true,
    render: (r: BacktestResult) =>
      r.sharpe_ratio == null ? <span className="text-zinc-500">—</span> : r.sharpe_ratio.toFixed(2),
  },
  {
    key: 'profit_factor',
    header: 'Profit Factor',
    sortable: true,
    render: (r: BacktestResult) =>
      r.profit_factor == null ? (
        <span className="text-zinc-500">—</span>
      ) : (
        formatRR(r.profit_factor)
      ),
  },
  {
    key: 'avg_holding_days',
    header: 'Avg Hold Days',
    sortable: true,
    render: (r: BacktestResult) =>
      r.avg_holding_days == null ? (
        <span className="text-zinc-500">—</span>
      ) : (
        `${r.avg_holding_days.toFixed(1)}d`
      ),
  },
];

export function MetricsComparisonTable({ results }: MetricsComparisonTableProps) {
  return DataTable({ columns, data: results });
}
