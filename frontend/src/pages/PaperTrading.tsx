import { useState } from 'react';
import { Search, FileBarChart } from 'lucide-react';
import { usePaperSummary, usePaperTrades } from '../hooks/usePaperTrading';
import { PaperSummaryCards } from '../components/paper_trading/PaperSummaryCards';
import { PnLCurveChart } from '../components/paper_trading/PnLCurveChart';
import { PaperTradeTable } from '../components/paper_trading/PaperTradeTable';
import { Pagination } from '../components/common/Pagination';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { cn } from '@/lib/utils';

const status_options = [
  { value: '', label: 'All Trades' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
] as const;

export default function PaperTradingPage() {
  const [status_filter, set_status_filter] = useState('');
  const [symbol_filter, set_symbol_filter] = useState('');
  const [current_page, set_current_page] = useState(1);
  const [page_size, set_page_size] = useState(20);

  const summary_query = usePaperSummary();
  const trades_query = usePaperTrades({
    status: status_filter || undefined,
    symbol: symbol_filter || undefined,
    page: current_page,
    limit: page_size,
  });
  const all_closed_query = usePaperTrades({ status: 'CLOSED', limit: 100 });

  const trades = trades_query.data?.items ?? [];
  const trades_pagination = trades_query.data?.pagination;
  const total_pages = trades_pagination?.total_pages ?? 1;
  const closed_trades = all_closed_query.data?.items ?? [];

  const handle_status_change = (value: string) => {
    set_status_filter(value);
    set_current_page(1);
  };

  const handle_symbol_change = (value: string) => {
    set_symbol_filter(value);
    set_current_page(1);
  };

  const handle_page_size_change = (size: number) => {
    set_page_size(size);
    set_current_page(1);
  };

  if (summary_query.isError || trades_query.isError) {
    return (
      <div className="p-6">
        <ErrorState
          message="Failed to load paper trading data"
          onRetry={() => {
            summary_query.refetch();
            trades_query.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">Paper Trading</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Track simulated trades and performance metrics
        </p>
      </div>

      {summary_query.isLoading && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <LoadingSkeleton variant="card" count={7} />
        </div>
      )}
      {!summary_query.isLoading && summary_query.data && (
        <PaperSummaryCards summary={summary_query.data} />
      )}

      {closed_trades.length > 0 && <PnLCurveChart trades={closed_trades} />}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={status_filter}
            onChange={(e) => handle_status_change(e.target.value)}
            className={cn(
              'rounded-md border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200',
              'focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500',
            )}
          >
            {status_options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Filter by symbol…"
              value={symbol_filter}
              onChange={(e) => handle_symbol_change(e.target.value)}
              className={cn(
                'rounded-md border border-zinc-700 bg-zinc-800 py-2 pl-8 pr-3 text-sm text-zinc-200',
                'placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500',
              )}
            />
          </div>
        </div>

        {trades_query.isLoading && <LoadingSkeleton variant="table-row" count={6} />}
        {!trades_query.isLoading && trades.length === 0 && (
          <EmptyState
            icon={<FileBarChart className="h-8 w-8" />}
            title="No paper trades found"
            description={
              status_filter || symbol_filter
                ? 'Try adjusting your filters.'
                : 'Paper trades will appear here once signals are generated.'
            }
          />
        )}
        {!trades_query.isLoading && trades.length > 0 && (
          <>
            <PaperTradeTable trades={trades} />
            {total_pages > 1 && (
              <div className="pt-2">
                <Pagination
                  page={current_page}
                  total_pages={total_pages}
                  onPageChange={set_current_page}
                  page_sizes={[10, 20, 50]}
                  current_size={page_size}
                  onPageSizeChange={handle_page_size_change}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
