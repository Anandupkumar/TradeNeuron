import { useSearchParams } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
import { useBacktestResults } from '../hooks/useBacktest';
import { BacktestResultCard } from '../components/backtest/BacktestResultCard';
import { MetricsComparisonTable } from '../components/backtest/MetricsComparisonTable';
import { WalkForwardChart } from '../components/backtest/WalkForwardChart';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { cn } from '@/lib/utils';

const strategy_options = [
  { value: '', label: 'All Strategies' },
  { value: 'TREND_PULLBACK', label: 'Trend Pullback' },
  { value: 'BREAKOUT', label: 'Breakout' },
  { value: 'RANGE', label: 'Range' },
  { value: 'MEAN_REVERSION', label: 'Mean Reversion' },
  { value: 'TREND_PULLBACK_SHORT', label: 'Trend Pullback Short' },
  { value: 'BREAKDOWN', label: 'Breakdown' },
] as const;

export default function BacktestPage() {
  const [params, set_params] = useSearchParams();
  const strategy_filter = params.get('strategy') ?? '';

  const set_strategy_filter = (value: string) => {
    const next = new URLSearchParams(params);
    if (value) { next.set('strategy', value); } else { next.delete('strategy'); }
    set_params(next, { replace: true });
  };

  const results_query = useBacktestResults({
    strategy: strategy_filter || undefined,
    latest: true,
  });
  const all_results_query = useBacktestResults({});

  const results = results_query.data?.results ?? [];
  const all_results = all_results_query.data?.results ?? [];

  if (results_query.isError) {
    return (
      <div className="p-6">
        <ErrorState
          message="Failed to load backtest results"
          onRetry={() => results_query.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Backtest Results</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Strategy performance metrics and walk-forward analysis
        </p>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={strategy_filter}
          onChange={(e) => set_strategy_filter(e.target.value)}
          className={cn(
            'rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground',
            'focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring',
          )}
        >
          {strategy_options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {strategy_filter && (
          <button
            onClick={() => set_strategy_filter('')}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear filter
          </button>
        )}
      </div>

      {results_query.isLoading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <LoadingSkeleton variant="card" count={3} />
        </div>
      )}
      {!results_query.isLoading && results.length === 0 && (
        <EmptyState
          icon={<FlaskConical className="h-8 w-8" />}
          title="No backtest results"
          description={
            strategy_filter
              ? 'No results found for this strategy. Try selecting a different one.'
              : 'Run a backtest to see performance metrics here.'
          }
        />
      )}
      {!results_query.isLoading && results.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {results.map((result) => (
              <div key={`${result.strategy_name}-${result.run_date}`}>
                <BacktestResultCard result={result} />
              </div>
            ))}
          </div>

          <div>
            <h2 className="mb-3 text-lg font-semibold text-foreground">Metrics Comparison</h2>
            <MetricsComparisonTable results={results} />
          </div>

          {all_results.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold text-foreground">Walk-Forward Analysis</h2>
              <WalkForwardChart results={all_results} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
