import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, FileBarChart } from 'lucide-react';
import { useDebounce } from '../hooks/useDebounce';
import { usePaperSummary, usePaperTrades } from '../hooks/usePaperTrading';
import { PaperSummaryCards } from '../components/paper_trading/PaperSummaryCards';
import { PnLCurveChart } from '../components/paper_trading/PnLCurveChart';
import { DrawdownChart } from '../components/charts/DrawdownChart';
import { ChartErrorBoundary } from '../components/errors/ChartErrorBoundary';
import { PaperTradeTable } from '../components/paper_trading/PaperTradeTable';
import { Pagination } from '../components/common/Pagination';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { cn } from '@/lib/utils';
import { PAGINATION } from '../utils/constants';
import { formatDate } from '../utils/format';
import type { PaperTrade } from '../types';

function DrawdownChartSection({ trades }: { trades: PaperTrade[] }) {
  const drawdown_data = useMemo(() => {
    const sorted = [...trades]
      .filter((t) => t.exit_date && t.pnl_pct != null)
      .sort((a, b) => (a.exit_date! < b.exit_date! ? -1 : 1));

    let cumulative = 0;
    let peak = 0;
    return sorted.map((t) => {
      cumulative += t.pnl_pct!;
      if (cumulative > peak) peak = cumulative;
      const drawdown = peak > 0 ? cumulative - peak : 0;
      return { date: formatDate(t.exit_date!), drawdown };
    });
  }, [trades]);

  if (drawdown_data.length === 0) return null;
  return <DrawdownChart data={drawdown_data} height={250} />;
}

const status_options = [
  { value: '', label: 'All Trades' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
] as const;

export default function PaperTradingPage() {
  const [params, set_params] = useSearchParams();

  const status_filter = params.get('status') ?? '';
  const current_page = params.get('page') ? Number(params.get('page')) : 1;
  const page_size = params.get('limit') ? Number(params.get('limit')) : 20;

  const [symbol_input, set_symbol_input] = useState(params.get('symbol') ?? '');
  const [debounced_symbol] = useDebounce(symbol_input, 300);

  useEffect(() => {
    set_symbol_input(params.get('symbol') ?? '');
  }, [params]);

  useEffect(() => {
    const next = new URLSearchParams(params);
    if (debounced_symbol) { next.set('symbol', debounced_symbol); } else { next.delete('symbol'); }
    next.set('page', '1');
    set_params(next, { replace: true });
  }, [debounced_symbol]);

  const update_params = (updates: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === '') { next.delete(k); } else { next.set(k, v); }
    });
    if (!('page' in updates)) next.set('page', '1');
    set_params(next, { replace: true });
  };

  const summary_query = usePaperSummary();
  const trades_query = usePaperTrades({
    status: status_filter || undefined,
    symbol: debounced_symbol || undefined,
    page: current_page,
    limit: page_size,
  });
  const all_closed_query = usePaperTrades({ status: 'CLOSED', limit: 100 });

  const trades = trades_query.data?.items ?? [];
  const trades_pagination = trades_query.data?.pagination;
  const total_pages = trades_pagination?.total_pages ?? 1;
  const closed_trades = all_closed_query.data?.items ?? [];

  const handle_status_change = (value: string) => {
    update_params({ status: value || undefined });
  };

  const handle_symbol_change = (value: string) => {
    set_symbol_input(value);
  };

  const handle_page_change = (page: number) => {
    update_params({ page: String(page) });
  };

  const handle_page_size_change = (size: number) => {
    update_params({ limit: String(size) });
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
        <h1 className="text-2xl font-bold text-foreground">Paper Trading</h1>
        <p className="mt-1 text-sm text-muted-foreground">
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

      {closed_trades.length > 0 && (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ChartErrorBoundary>
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Equity Curve</h3>
              <PnLCurveChart trades={closed_trades} />
            </div>
          </ChartErrorBoundary>
          <ChartErrorBoundary>
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Drawdown</h3>
              <DrawdownChartSection trades={closed_trades} />
            </div>
          </ChartErrorBoundary>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={status_filter}
            onChange={(e) => handle_status_change(e.target.value)}
            className={cn(
              'rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground',
              'focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring',
            )}
          >
            {status_options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter by symbol…"
              value={symbol_input}
              onChange={(e) => handle_symbol_change(e.target.value)}
              className={cn(
                'rounded-md border border-border bg-muted py-2 pl-8 pr-3 text-sm text-foreground',
                'placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring',
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
              status_filter || debounced_symbol
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
                  onPageChange={handle_page_change}
                  page_sizes={[20, 50, 100]}
                  current_size={page_size || PAGINATION.defaultPageSize}
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
