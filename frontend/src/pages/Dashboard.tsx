import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Activity, Star, BarChart3 } from 'lucide-react';
import { useActiveSignals } from '../hooks/useActiveSignals';
import { useHealth } from '../hooks/useHealth';
import { useFavorites } from '../hooks/useFavorites';
import { usePaperSummary, usePaperTrades } from '../hooks/usePaperTrading';
import { useMarketStatus } from '../hooks/useMarketStatus';
import { StatCard } from '../components/common/StatCard';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { SignalCard } from '../components/signals/SignalCard';
import { MarketRegimeBadge } from '../components/common/MarketRegimeBadge';
import { PnLCurveChart } from '../components/paper_trading/PnLCurveChart';
import { formatPct } from '../utils/format';
import { featureFlags } from '../utils/featureFlags';
import type { MarketRegime, PaperTradingSummary, HealthData, Signal } from '../types';

function ThirdStatCard({
  paper_enabled,
  paper_summary,
  favorites_count,
}: {
  paper_enabled: boolean;
  paper_summary: PaperTradingSummary | undefined;
  favorites_count: number;
}) {
  if (paper_enabled && paper_summary) {
    return (
      <StatCard
        label="Open Paper Trades"
        value={paper_summary.open_trades}
        sub_text={`${paper_summary.total_trades} total trades`}
      />
    );
  }
  return <StatCard label="Watchlist" value={favorites_count} sub_text="symbols tracked" />;
}

function FourthStatCard({
  paper_enabled,
  paper_summary,
  health,
}: {
  paper_enabled: boolean;
  paper_summary: PaperTradingSummary | undefined;
  health: HealthData | undefined;
}) {
  if (paper_enabled && paper_summary) {
    const pnl = paper_summary.total_pnl_pct ?? 0;
    return (
      <StatCard
        label="Total PnL"
        value={formatPct(pnl, true)}
        trend={pnl >= 0 ? 'up' : 'down'}
        sub_text={`Win rate: ${formatPct(paper_summary.win_rate_pct)}`}
      />
    );
  }
  return (
    <StatCard
      label="System Status"
      value={health?.status === 'ok' ? 'Healthy' : 'Degraded'}
      sub_text={health?.db === 'connected' ? 'DB connected' : 'DB issue'}
    />
  );
}

function SignalSection({
  is_loading,
  active_signals,
  active_count,
}: {
  is_loading: boolean;
  active_signals: Signal[];
  active_count: number;
}) {
  if (is_loading) return <LoadingSkeleton variant="table-row" count={3} />;

  if (active_signals.length === 0) {
    return (
      <EmptyState
        icon={<Activity className="h-8 w-8" />}
        title="No active signals"
        description="Signals will appear here after the daily pipeline runs."
        action={
          <Link
            to="/signals"
            className="rounded-md bg-muted px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
          >
            View Signal History
          </Link>
        }
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {active_signals.slice(0, 5).map((signal) => (
          <div key={signal.id}>
            <SignalCard signal={signal} />
          </div>
        ))}
      </div>
      {active_signals.length > 5 && (
        <Link
          to="/signals?status=ACTIVE"
          className="inline-flex text-sm text-emerald-400 transition-colors hover:text-emerald-300"
        >
          View all {active_count} active signals →
        </Link>
      )}
    </>
  );
}

export default function DashboardPage() {
  const signals_query = useActiveSignals();
  const health_query = useHealth();
  const favorites_query = useFavorites();
  const paper_summary_query = usePaperSummary();
  const paper_trades_query = usePaperTrades({ status: 'CLOSED', limit: 50 });
  const market_status = useMarketStatus(health_query.data?.last_pipeline_run);

  const paper_enabled = featureFlags.canAccessPaperTrading();
  const is_loading = signals_query.isLoading || health_query.isLoading;
  const has_error = signals_query.isError || health_query.isError;

  const active_signals = signals_query.data?.signals ?? [];
  const active_count = active_signals.length;
  const favorites = favorites_query.data?.favorites ?? [];
  const paper_summary = paper_summary_query.data;
  const closed_trades = paper_trades_query.data?.items ?? [];

  const derived_regime: MarketRegime = useMemo(() => {
    if (active_count > 0) return 'BULLISH';
    return 'SIDEWAYS';
  }, [active_count]);

  if (has_error) {
    return (
      <div className="p-6">
        <ErrorState
          message="Failed to load dashboard data"
          onRetry={() => {
            signals_query.refetch();
            health_query.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {market_status.marketOpen ? 'Market is open' : 'Market is closed'}
          {market_status.dataIsStale && ' · Data may be stale'}
        </p>
      </div>

      {is_loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <LoadingSkeleton variant="card" count={4} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Active Signals"
            value={active_count}
            sub_text={active_count > 0 ? `${active_count} opportunities` : 'No signals today'}
          />
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Market Regime</p>
            <div className="mt-2">
              <MarketRegimeBadge regime={derived_regime} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {market_status.pipelineRanToday ? 'Pipeline ran today' : 'Awaiting pipeline'}
            </p>
          </div>
          <ThirdStatCard paper_enabled={paper_enabled} paper_summary={paper_summary} favorites_count={favorites.length} />
          <FourthStatCard paper_enabled={paper_enabled} paper_summary={paper_summary} health={health_query.data} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <h2 className="text-lg font-semibold text-foreground">Active Signals</h2>
          <SignalSection is_loading={signals_query.isLoading} active_signals={active_signals} active_count={active_count} />
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Watchlist</h2>
          <div className="rounded-lg border border-border bg-card p-4">
            {favorites_query.isLoading && <LoadingSkeleton variant="text" />}
            {!favorites_query.isLoading && favorites.length === 0 && (
              <div className="py-8 text-center">
                <Star className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">No favorites yet</p>
              </div>
            )}
            {!favorites_query.isLoading && favorites.length > 0 && (
              <div className="space-y-1">
                {favorites.slice(0, 8).map((fav) => (
                  <Link
                    key={fav.id}
                    to={`/stock/${encodeURIComponent(fav.symbol)}`}
                    className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    <span className="font-medium">{fav.symbol}</span>
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  </Link>
                ))}
                {favorites.length > 8 && (
                  <p className="pt-1 text-center text-xs text-muted-foreground">
                    +{favorites.length - 8} more
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {paper_enabled && closed_trades.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Equity Curve</h2>
          </div>
          <PnLCurveChart trades={closed_trades} />
        </div>
      )}
    </div>
  );
}
