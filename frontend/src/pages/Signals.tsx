import { useState } from 'react';
import { Zap, ChevronDown, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useSignalFilters } from '../hooks/useFilterUrlSync';
import { useSignals } from '../hooks/useSignals';
import { useActiveSignals } from '../hooks/useActiveSignals';
import { useDecisionHistory } from '../hooks/useTradeDecisions';
import { signalsApi } from '../api/signals.api';
import { SignalFilters as SignalFiltersBar } from '../components/signals/SignalFilters';
import { SignalCard } from '../components/signals/SignalCard';
import { SignalTable } from '../components/signals/SignalTable';
import { SignalDetailDrawer } from '../components/signals/SignalDetailDrawer';
import { Pagination } from '../components/common/Pagination';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { formatINR, formatPct } from '../utils/format';
import type { Signal, SignalFilters, RejectedSignal, DecisionHistoryItem } from '../types';

interface AllSignalsContentProps {
  is_loading: boolean;
  is_error: boolean;
  signal_list: Signal[];
  total_pages: number;
  current_page: number;
  filters: SignalFilters;
  on_row_click: (s: Signal) => void;
  on_refetch: () => void;
  on_filter_change: (f: Partial<SignalFilters>) => void;
}

function AllSignalsContent(props: AllSignalsContentProps) {
  if (props.is_loading) return <LoadingSkeleton variant="table-row" count={8} />;

  if (props.is_error) {
    return <ErrorState message="Failed to load signals" onRetry={props.on_refetch} />;
  }

  if (props.signal_list.length === 0) {
    return (
      <EmptyState
        icon={<Zap className="h-8 w-8" />}
        title="No signals found"
        description="Try adjusting your filters or wait for the next pipeline run."
      />
    );
  }

  return (
    <>
      <SignalTable signals={props.signal_list} on_row_click={props.on_row_click} />
      {props.total_pages > 1 && (
        <div className="pt-2">
          <Pagination
            page={props.current_page}
            total_pages={props.total_pages}
            onPageChange={(page: number) => props.on_filter_change({ page })}
            page_sizes={[10, 20, 50]}
            current_size={props.filters.limit ?? 20}
            onPageSizeChange={(size: number) => props.on_filter_change({ limit: size, page: 1 })}
          />
        </div>
      )}
    </>
  );
}

const REJECT_STAGE_COLORS: Record<string, string> = {
  LIQUIDITY_GATE: 'bg-red-900/50 text-red-300',
  VWAP_FILTER: 'bg-amber-900/50 text-amber-300',
  PCR_FILTER: 'bg-purple-900/50 text-purple-300',
  CONFIDENCE_GATE: 'bg-orange-900/50 text-orange-300',
  RR_GATE: 'bg-yellow-900/50 text-yellow-300',
  ACTIVE_CAP: 'bg-blue-900/50 text-blue-300',
  SECTOR_GATE: 'bg-indigo-900/50 text-indigo-300',
  POSITION_SIZING: 'bg-pink-900/50 text-pink-300',
  MERGED_RISK_ZERO: 'bg-red-900/50 text-red-300',
  FUNDAMENTAL_FILTER: 'bg-teal-900/50 text-teal-300',
  SENTIMENT_FILTER: 'bg-cyan-900/50 text-cyan-300',
};

function RejectedSignalsSection() {
  const [show, set_show] = useState(false);
  const query = useQuery({
    queryKey: ['rejected-signals'],
    queryFn: () => signalsApi.rejected(),
    enabled: show,
    staleTime: 5 * 60 * 1000,
  });

  const rejected = query.data?.rejected ?? [];

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => set_show((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {show ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Show rejected signals
        {show && rejected.length > 0 && ` (${rejected.length})`}
      </button>

      {show && (
        <div>
          {query.isLoading && <LoadingSkeleton variant="table-row" count={4} />}
          {query.isError && <ErrorState message="Failed to load rejected signals" onRetry={() => { query.refetch(); }} />}
          {!query.isLoading && !query.isError && rejected.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No rejected signals</p>
          )}
          {rejected.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-card/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5">Symbol</th>
                    <th className="px-4 py-2.5">Strategy</th>
                    <th className="px-4 py-2.5">Stage</th>
                    <th className="px-4 py-2.5">Reason</th>
                    <th className="px-4 py-2.5 text-right">Confidence</th>
                    <th className="px-4 py-2.5 text-right">R:R</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {rejected.map((r: RejectedSignal) => (
                    <tr key={r.id} className="text-muted-foreground">
                      <td className="whitespace-nowrap px-4 py-2 font-medium text-foreground">{r.symbol}</td>
                      <td className="whitespace-nowrap px-4 py-2">{r.strategy_source}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${REJECT_STAGE_COLORS[r.reject_stage] ?? 'bg-muted text-muted-foreground'}`}>
                          {r.reject_stage.replaceAll('_', ' ')}
                        </span>
                      </td>
                      <td className="max-w-xs truncate px-4 py-2 text-muted-foreground">{r.reject_reason}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">{r.raw_confidence == null ? '—' : `${r.raw_confidence}%`}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">{r.raw_rr == null ? '—' : `${r.raw_rr}x`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const DECISION_COLORS: Record<string, string> = {
  TAKEN: 'bg-emerald-900/50 text-emerald-300',
  SKIPPED: 'bg-muted/50 text-muted-foreground',
  MODIFIED: 'bg-amber-900/50 text-amber-300',
};

function DecisionHistorySection() {
  const [show, set_show] = useState(false);
  const query = useDecisionHistory(50);

  const decisions = query.data?.decisions ?? [];

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => set_show((v) => !v)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {show ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Decision history
        {show && decisions.length > 0 && ` (${decisions.length})`}
      </button>

      {show && (
        <div>
          {query.isLoading && <LoadingSkeleton variant="table-row" count={4} />}
          {query.isError && <ErrorState message="Failed to load decision history" onRetry={() => { query.refetch(); }} />}
          {!query.isLoading && !query.isError && decisions.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">No decisions recorded yet</p>
          )}
          {decisions.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-card/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5">Symbol</th>
                    <th className="px-4 py-2.5">Direction</th>
                    <th className="px-4 py-2.5">Decision</th>
                    <th className="px-4 py-2.5 text-right">Entry</th>
                    <th className="px-4 py-2.5 text-right">Confidence</th>
                    <th className="px-4 py-2.5">Notes</th>
                    <th className="px-4 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {decisions.map((d: DecisionHistoryItem) => (
                    <tr key={d.id} className="text-muted-foreground">
                      <td className="whitespace-nowrap px-4 py-2 font-medium text-foreground">{d.symbol}</td>
                      <td className="whitespace-nowrap px-4 py-2">{d.direction}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${DECISION_COLORS[d.decision] ?? 'bg-muted text-muted-foreground'}`}>
                          {d.decision}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">{formatINR(d.entry_price)}</td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">{formatPct(d.confidence)}</td>
                      <td className="max-w-xs truncate px-4 py-2 text-muted-foreground">{d.notes ?? '—'}</td>
                      <td className="whitespace-nowrap px-4 py-2">{d.signal_status?.replaceAll('_', ' ') ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SignalsPage() {
  const [filters, set_filters] = useSignalFilters();
  const signals_query = useSignals(filters);
  const active_query = useActiveSignals();
  const [selected_signal, set_selected_signal] = useState<Signal | null>(null);
  const [drawer_open, set_drawer_open] = useState(false);

  const active_signals = active_query.data?.signals ?? [];
  const signal_list = signals_query.data?.signals ?? [];
  const pagination_meta = signals_query.data?.pagination;
  const total_pages = pagination_meta?.total_pages ?? 1;
  const current_page = filters.page ?? 1;

  const handle_row_click = (signal: Signal) => {
    set_selected_signal(signal);
    set_drawer_open(true);
  };

  const handle_close_drawer = () => {
    set_drawer_open(false);
    set_selected_signal(null);
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Signals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse and filter trade signals
          {pagination_meta && ` · ${pagination_meta.total} total`}
        </p>
      </div>

      <SignalFiltersBar filters={filters} on_change={set_filters} />

      {active_signals.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">
            Active Signals ({active_signals.length})
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {active_signals.map((signal) => (
              <button
                key={signal.id}
                type="button"
                className="text-left"
                onClick={() => handle_row_click(signal)}
              >
                <SignalCard signal={signal} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">All Signals</h2>
        <AllSignalsContent
          is_loading={signals_query.isLoading}
          is_error={signals_query.isError}
          signal_list={signal_list}
          total_pages={total_pages}
          current_page={current_page}
          filters={filters}
          on_row_click={handle_row_click}
          on_refetch={() => { signals_query.refetch(); }}
          on_filter_change={set_filters}
        />
      </div>

      <RejectedSignalsSection />

      <DecisionHistorySection />

      <SignalDetailDrawer
        signal={selected_signal}
        open={drawer_open}
        on_close={handle_close_drawer}
      />
    </div>
  );
}
