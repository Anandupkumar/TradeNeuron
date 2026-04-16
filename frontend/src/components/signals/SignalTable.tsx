import { cn } from '@/lib/utils';
import { featureFlags } from '../../utils/featureFlags';
import { formatINR, formatDate, formatRR } from '../../utils/format';
import { DataTable } from '../common/DataTable';
import { SignalBadge } from './SignalBadge';
import { StatusBadge } from '../common/StatusBadge';
import { ExecutionBadge } from './ExecutionBadge';
import type { Signal } from '../../types';

interface Column {
  key: string;
  header: string;
  render: (signal: Signal) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface SignalTableProps {
  signals: Signal[];
  on_row_click?: (signal: Signal) => void;
  className?: string;
}

export function SignalTable({ signals, on_row_click, className }: SignalTableProps) {
  const columns: Column[] = [
    {
      key: 'symbol',
      header: 'Symbol',
      sortable: true,
      render: (signal: Signal) => (
        <span className="font-medium text-foreground">{signal.symbol}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (signal: Signal) => (
        <SignalBadge signal_type={signal.signal_type} direction={signal.direction} />
      ),
    },
    featureFlags.showShortDirection()
      ? {
          key: 'direction',
          header: 'Direction',
          render: (signal: Signal) => (
            <span
              className={cn(
                'text-xs font-medium',
                signal.direction === 'LONG' ? 'text-emerald-400' : 'text-red-400',
              )}
            >
              {signal.direction}
            </span>
          ),
        }
      : null,
    featureFlags.showShortDirection()
      ? {
          key: 'exec',
          header: 'Exec',
          render: (signal: Signal) =>
            !signal.is_executable ? (
              <ExecutionBadge execution_type={signal.execution_type} />
            ) : (
              <span className="text-xs text-muted-foreground">{signal.execution_type}</span>
            ),
        }
      : null,
    {
      key: 'confidence',
      header: 'Confidence',
      sortable: true,
      className: 'text-right',
      render: (signal: Signal) => (
        <span className="font-medium text-foreground">{Math.round(signal.confidence)}%</span>
      ),
    },
    {
      key: 'tier',
      header: 'Tier',
      render: (signal: Signal) => {
        if (!signal.confidence_tier) return <span className="text-muted-foreground">—</span>;
        const styles: Record<string, string> = {
          HIGH: 'bg-emerald-500/15 text-emerald-400',
          NORMAL: 'bg-blue-500/15 text-blue-400',
          LOW: 'bg-amber-500/15 text-amber-400',
        };
        const labels: Record<string, string> = { HIGH: 'High', NORMAL: 'Normal', LOW: 'Low' };
        return (
          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', styles[signal.confidence_tier])}>
            {labels[signal.confidence_tier]}
          </span>
        );
      },
    },
    {
      key: 'entry',
      header: 'Entry',
      sortable: true,
      className: 'text-right',
      render: (signal: Signal) => (
        <span className="text-muted-foreground">{formatINR(signal.entry_price)}</span>
      ),
    },
    {
      key: 'target',
      header: 'Target',
      className: 'text-right',
      render: (signal: Signal) => (
        <span className="text-emerald-400">{formatINR(signal.target_price)}</span>
      ),
    },
    {
      key: 'sl',
      header: 'SL',
      className: 'text-right',
      render: (signal: Signal) => (
        <span className="text-red-400">{formatINR(signal.stop_loss)}</span>
      ),
    },
    {
      key: 'rr',
      header: 'R:R',
      sortable: true,
      className: 'text-right',
      render: (signal: Signal) => (
        <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
          {formatRR(signal.risk_reward)}
        </span>
      ),
    },
    {
      key: 'strategy',
      header: 'Strategy',
      render: (signal: Signal) => (
        <span className="text-xs text-muted-foreground">
          {signal.strategy_source.split('_').join(' ')}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (signal: Signal) => <StatusBadge status={signal.status} />,
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (signal: Signal) => (
        <span className="text-xs text-muted-foreground">{formatDate(signal.date)}</span>
      ),
    },
  ].filter(Boolean) as Column[];

  return (
    <DataTable
      columns={columns}
      data={signals}
      onRowClick={on_row_click}
      className={className}
      getRowKey={(signal) => signal.id}
    />
  );
}
