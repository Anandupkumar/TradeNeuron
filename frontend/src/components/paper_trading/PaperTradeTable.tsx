import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataTable } from '../common/DataTable';
import { SignalBadge } from '../signals/SignalBadge';
import { StatusBadge } from '../common/StatusBadge';
import { formatINR, formatPct, formatDate, formatExitReason } from '../../utils/format';
import type { PaperTrade } from '../../types';

interface PaperTradeTableProps {
  trades: PaperTrade[];
  on_row_click?: (trade: PaperTrade) => void;
}

function pnlCell(value: number | null) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const is_positive = value >= 0;
  return (
    <span className={cn(is_positive ? 'text-emerald-400' : 'text-red-400')}>
      {formatPct(value, true)}
    </span>
  );
}

const columns = [
  {
    key: 'symbol',
    header: 'Symbol',
    sortable: true,
    render: (t: PaperTrade) => <span className="font-medium">{t.symbol}</span>,
  },
  {
    key: 'direction',
    header: 'Direction',
    render: (t: PaperTrade) =>
      SignalBadge({ signal_type: t.direction === 'LONG' ? 'BUY' : 'SELL', direction: t.direction }),
  },
  {
    key: 'entry_date',
    header: 'Entry Date',
    sortable: true,
    render: (t: PaperTrade) => formatDate(t.entry_date),
  },
  {
    key: 'entry_price',
    header: 'Entry Price',
    sortable: true,
    render: (t: PaperTrade) => formatINR(t.entry_price),
  },
  {
    key: 'target_price',
    header: 'Target',
    render: (t: PaperTrade) => formatINR(t.target_price),
  },
  {
    key: 'stop_loss',
    header: 'SL',
    render: (t: PaperTrade) => formatINR(t.stop_loss),
  },
  {
    key: 'exit_date',
    header: 'Exit Date',
    sortable: true,
    render: (t: PaperTrade) =>
      t.exit_date == null ? <span className="text-muted-foreground">—</span> : formatDate(t.exit_date),
  },
  {
    key: 'exit_price',
    header: 'Exit Price',
    render: (t: PaperTrade) =>
      t.exit_price == null ? <span className="text-muted-foreground">—</span> : formatINR(t.exit_price),
  },
  {
    key: 'pnl_pct',
    header: 'PnL%',
    sortable: true,
    render: (t: PaperTrade) => pnlCell(t.pnl_pct),
  },
  {
    key: 'gross_pnl_inr',
    header: 'Gross PnL',
    sortable: true,
    render: (t: PaperTrade) =>
      t.gross_pnl_inr == null ? (
        <span className="text-muted-foreground">—</span>
      ) : (
        <span className={cn(t.gross_pnl_inr >= 0 ? 'text-emerald-400' : 'text-red-400')}>
          {formatINR(t.gross_pnl_inr)}
        </span>
      ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (t: PaperTrade) => StatusBadge({ status: t.status }),
  },
  {
    key: 'exit_reason',
    header: 'Exit Reason',
    render: (t: PaperTrade) =>
      t.exit_reason ? (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          {formatExitReason(t.exit_reason)}
          {t.exit_reason === 'EXPIRED_PENALIZED' && (
            <span className="group relative">
              <Info className="h-3 w-3 text-amber-400" />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 whitespace-nowrap rounded bg-popover px-2 py-1 text-[10px] text-popover-foreground opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                Opportunity cost penalty applied due to negligible price movement
              </span>
            </span>
          )}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
];

export function PaperTradeTable({ trades, on_row_click }: PaperTradeTableProps) {
  return DataTable({ columns, data: trades, onRowClick: on_row_click });
}
