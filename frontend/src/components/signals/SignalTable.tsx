import { cn } from '@/lib/utils';
import { featureFlags } from '../../utils/featureFlags';
import { formatINR, formatDate, formatRR } from '../../utils/format';
import { SignalBadge } from './SignalBadge';
import { StatusBadge } from '../common/StatusBadge';
import type { Signal } from '../../types';

interface Column {
  key: string;
  label: string;
  render: (signal: Signal) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
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
      label: 'Symbol',
      render: (signal: Signal) => (
        <span className="font-medium text-zinc-100">{signal.symbol}</span>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (signal: Signal) => (
        <SignalBadge signal_type={signal.signal_type} direction={signal.direction} />
      ),
    },
    featureFlags.showShortDirection()
      ? {
          key: 'direction',
          label: 'Direction',
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
    {
      key: 'confidence',
      label: 'Confidence',
      align: 'right' as const,
      render: (signal: Signal) => (
        <span className="font-medium text-zinc-200">{Math.round(signal.confidence)}%</span>
      ),
    },
    {
      key: 'entry',
      label: 'Entry',
      align: 'right' as const,
      render: (signal: Signal) => (
        <span className="text-zinc-300">{formatINR(signal.entry_price)}</span>
      ),
    },
    {
      key: 'target',
      label: 'Target',
      align: 'right' as const,
      render: (signal: Signal) => (
        <span className="text-emerald-400">{formatINR(signal.target_price)}</span>
      ),
    },
    {
      key: 'sl',
      label: 'SL',
      align: 'right' as const,
      render: (signal: Signal) => (
        <span className="text-red-400">{formatINR(signal.stop_loss)}</span>
      ),
    },
    {
      key: 'rr',
      label: 'R:R',
      align: 'right' as const,
      render: (signal: Signal) => (
        <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-medium text-zinc-300">
          {formatRR(signal.risk_reward)}
        </span>
      ),
    },
    {
      key: 'strategy',
      label: 'Strategy',
      render: (signal: Signal) => (
        <span className="text-xs text-zinc-400">
          {signal.strategy_source.split('_').join(' ')}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (signal: Signal) => <StatusBadge status={signal.status} />,
    },
    {
      key: 'date',
      label: 'Date',
      render: (signal: Signal) => (
        <span className="text-xs text-zinc-400">{formatDate(signal.date)}</span>
      ),
    },
  ].filter(Boolean) as Column[];

  return (
    <div className={cn('overflow-x-auto rounded-lg border border-zinc-800', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'whitespace-nowrap px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-500',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                  col.align !== 'right' && col.align !== 'center' && 'text-left',
                )}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {signals.map((signal) => (
            <tr
              key={signal.id}
              onClick={() => on_row_click?.(signal)}
              className={cn(
                'bg-zinc-900 transition-colors hover:bg-zinc-800/50',
                on_row_click && 'cursor-pointer',
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'whitespace-nowrap px-4 py-3',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                  )}
                >
                  {col.render(signal)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
