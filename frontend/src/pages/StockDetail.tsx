import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3, CandlestickChart as CandlestickIcon } from 'lucide-react';
import { subMonths, subYears, format } from 'date-fns';
import { useStockDetail } from '../hooks/useStockDetail';
import { useHistory } from '../hooks/useHistory';
import { useAddFavorite, useRemoveFavorite } from '../hooks/useFavorites';
import { StockHeader } from '../components/stocks/StockHeader';
import { IndicatorGrid } from '../components/stocks/IndicatorGrid';
import { FeatureGrid } from '../components/stocks/FeatureGrid';
import { CandlestickChart } from '../components/charts/CandlestickChart';
import { VolumeChart } from '../components/charts/VolumeChart';
import { IndicatorOverlay } from '../components/charts/IndicatorOverlay';
import { ChartErrorBoundary } from '../components/errors/ChartErrorBoundary';
import { SignalCard } from '../components/signals/SignalCard';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { cn } from '@/lib/utils';

type Timeframe = '1M' | '3M' | '6M' | '1Y';

const timeframe_options: Timeframe[] = ['1M', '3M', '6M', '1Y'];

function safeDecodeSymbol(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

function computeFromDate(tf: Timeframe): string {
  const now = new Date();
  switch (tf) {
    case '1M':
      return format(subMonths(now, 1), 'yyyy-MM-dd');
    case '3M':
      return format(subMonths(now, 3), 'yyyy-MM-dd');
    case '6M':
      return format(subMonths(now, 6), 'yyyy-MM-dd');
    case '1Y':
      return format(subYears(now, 1), 'yyyy-MM-dd');
  }
}

function useTodayDate() {
  const [today, set_today] = useState(() => format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    const interval = globalThis.setInterval(() => {
      const next = format(new Date(), 'yyyy-MM-dd');
      set_today((current) => (current === next ? current : next));
    }, 60 * 1000);

    return () => globalThis.clearInterval(interval);
  }, []);

  return today;
}

export default function StockDetailPage() {
  const { symbol: encoded_symbol } = useParams<{ symbol: string }>();
  const symbol = safeDecodeSymbol(encoded_symbol) ?? '';
  const has_valid_symbol = symbol.length > 0;

  const navigate = useNavigate();
  const [timeframe, set_timeframe] = useState<Timeframe>('6M');

  const from_date = useMemo(() => computeFromDate(timeframe), [timeframe]);
  const to_date = useTodayDate();

  const detail_query = useStockDetail(symbol);
  const add_favorite = useAddFavorite();
  const remove_favorite = useRemoveFavorite();
  const history_query = useHistory(symbol, {
    from_date,
    to_date,
    include_indicators: true,
  });

  const stock = detail_query.data ?? null;
  const candles = history_query.data?.candles ?? [];
  const is_initial_loading = detail_query.isLoading && !stock;
  const is_history_loading = history_query.isLoading && candles.length === 0;

  const handle_favorite_toggle = () => {
    if (!stock) return;
    if (stock.is_favorite) {
      remove_favorite.mutate(stock.symbol);
      return;
    }
    add_favorite.mutate({ symbol: stock.symbol });
  };

  if (!has_valid_symbol) {
    return (
      <div className="p-6">
        <ErrorState
          message="This stock symbol is missing or invalid."
          onRetry={() => navigate('/signals')}
        />
      </div>
    );
  }

  if (is_initial_loading) {
    return (
      <div className="space-y-4 p-6">
        <LoadingSkeleton variant="chart" />
        <LoadingSkeleton variant="card" count={3} />
      </div>
    );
  }

  if (detail_query.isError) {
    return (
      <div className="p-6">
        <ErrorState
          message="Failed to load stock details"
          onRetry={() => detail_query.refetch()}
        />
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<CandlestickIcon className="h-8 w-8" />}
          title="Stock details unavailable"
          description="The backend did not return detail data for this symbol."
          action={(
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-md bg-muted px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
            >
              Go back
            </button>
          )}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="text-sm text-muted-foreground">Back</span>
      </div>

      <StockHeader
        stock={stock}
        on_favorite_toggle={handle_favorite_toggle}
        favorite_disabled={add_favorite.isPending || remove_favorite.isPending}
      />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">Price Action</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Adjusted-close candles with EMA overlays and volume context.
            </p>
          </div>

          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            {timeframe_options.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => set_timeframe(tf)}
                className={cn(
                  'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
                  timeframe === tf
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {is_history_loading && <LoadingSkeleton variant="chart" />}
          {history_query.isError && (
            <ErrorState
              message="Failed to load price history"
              onRetry={() => history_query.refetch()}
            />
          )}
          {!is_history_loading && !history_query.isError && candles.length === 0 && (
            <EmptyState
              icon={<BarChart3 className="h-8 w-8" />}
              title="No price history available"
              description="Try another timeframe or check whether history exists for this symbol."
            />
          )}
          {!is_history_loading && !history_query.isError && candles.length > 0 && (
            <>
              <ChartErrorBoundary className="h-[420px]">
                <CandlestickChart candles={candles} height={420} />
              </ChartErrorBoundary>
              <div className="rounded-lg border border-border/60 bg-background/40 p-3">
                <IndicatorOverlay indicators={stock.indicators} />
              </div>
              <ChartErrorBoundary className="h-40">
                <VolumeChart candles={candles} height={140} />
              </ChartErrorBoundary>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-foreground">Indicators</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Trend, momentum, volatility, and participation context.
          </p>
          <IndicatorGrid indicators={stock.indicators} features={stock.features} />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-foreground">Features</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Derived setup quality, participation, and relative-strength signals.
          </p>
          <FeatureGrid features={stock.features} />
        </div>
      </div>

      {stock.active_signal && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Active Signal</h2>
          <SignalCard signal={stock.active_signal} />
        </div>
      )}
    </div>
  );
}
