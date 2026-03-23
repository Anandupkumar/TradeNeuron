import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { subMonths, subYears, format } from 'date-fns';
import { useStockDetail } from '../hooks/useStockDetail';
import { useHistory } from '../hooks/useHistory';
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
import { cn } from '@/lib/utils';

type Timeframe = '1M' | '3M' | '6M' | '1Y';

const timeframe_options: Timeframe[] = ['1M', '3M', '6M', '1Y'];

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

export default function stockDetailPage() {
  const { symbol: encoded_symbol } = useParams<{ symbol: string }>();
  const symbol = decodeURIComponent(encoded_symbol ?? '');

  const [timeframe, set_timeframe] = useState<Timeframe>('6M');

  const from_date = useMemo(() => computeFromDate(timeframe), [timeframe]);
  const to_date = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const detail_query = useStockDetail(symbol);
  const history_query = useHistory(symbol, {
    from_date,
    to_date,
    include_indicators: true,
  });

  if (detail_query.isLoading || history_query.isLoading) {
    return (
      <div className="space-y-4 p-6">
        {LoadingSkeleton({ variant: 'chart' })}
        {LoadingSkeleton({ variant: 'card', count: 3 })}
      </div>
    );
  }

  if (detail_query.isError) {
    return (
      <div className="p-6">
        {ErrorState({
          message: 'Failed to load stock details',
          onRetry: () => detail_query.refetch(),
        })}
      </div>
    );
  }

  if (history_query.isError) {
    return (
      <div className="p-6">
        {ErrorState({
          message: 'Failed to load price history',
          onRetry: () => history_query.refetch(),
        })}
      </div>
    );
  }

  const stock = detail_query.data;
  const candles = history_query.data?.candles ?? [];

  if (!stock) return null;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="text-sm text-zinc-500">Back to Dashboard</span>
      </div>

      {StockHeader({ stock })}

      <div className="flex items-center gap-1 rounded-lg bg-zinc-900 p-1">
        {timeframe_options.map((tf) => (
          <button
            key={tf}
            onClick={() => set_timeframe(tf)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              timeframe === tf
                ? 'bg-zinc-700 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-200',
            )}
          >
            {tf}
          </button>
        ))}
      </div>

      <ChartErrorBoundary>
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
          {CandlestickChart({ candles })}
        </div>
      </ChartErrorBoundary>

      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        {VolumeChart({ candles })}
      </div>

      {IndicatorOverlay({ indicators: stock.indicators })}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold text-zinc-100">Indicators</h2>
          {IndicatorGrid({ indicators: stock.indicators })}
        </div>
        <div>
          <h2 className="mb-3 text-lg font-semibold text-zinc-100">Features</h2>
          {FeatureGrid({ features: stock.features })}
        </div>
      </div>

      {stock.active_signal && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-zinc-100">Active Signal</h2>
          {SignalCard({ signal: stock.active_signal })}
        </div>
      )}
    </div>
  );
}
