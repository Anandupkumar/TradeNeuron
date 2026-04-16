import { useState } from 'react';
import { Zap, ChevronDown, ChevronRight, Filter, History } from 'lucide-react';
import { useSignalFilters } from '../hooks/useFilterUrlSync';
import { useSignals } from '../hooks/useSignals';
import { useActiveSignals } from '../hooks/useActiveSignals';
import { useDecisionHistory } from '../hooks/useTradeDecisions';
import { useRejectedSignals } from '../hooks/useRejectedSignals';
import { SignalFilters as SignalFiltersBar } from '../components/signals/SignalFilters';
import { SignalCard } from '../components/signals/SignalCard';
import { SignalTable } from '../components/signals/SignalTable';
import { SignalDetailDrawer } from '../components/signals/SignalDetailDrawer';
import { DataTable } from '../components/common/DataTable';
import { Pagination } from '../components/common/Pagination';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { PAGINATION } from '../utils/constants';
import { formatINR, formatPct, formatRR, formatDateTime } from '../utils/format';
import type { Signal, SignalFilters, RejectedSignal, DecisionHistoryItem } from '../types';

interface AllSignalsContentProps {
  is_loading: boolean;
  is_error: boolean;
  signal_list: Signal[];
  total_items: number;
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
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col gap-2 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Signal History</h2>
          <p className="text-sm text-muted-foreground">
            {props.total_items} total signals matching the current filter set.
          </p>
        </div>
      </div>
      <div className="p-4">
      <SignalTable signals={props.signal_list} on_row_click={props.on_row_click} />
      </div>
      <div className="border-t border-border px-4 py-3">
          <Pagination
            page={props.current_page}
            total_pages={props.total_pages}
            onPageChange={(page: number) => props.on_filter_change({ page })}
            page_sizes={[20, 50, 100]}
            current_size={props.filters.limit ?? PAGINATION.defaultPageSize}
            onPageSizeChange={(size: number) => props.on_filter_change({ limit: size, page: 1 })}
          />
      </div>
    </div>
  );
}

const REJECT_STAGE_COLORS: Record<string, string> = {
  DUPLICATE: 'bg-slate-900/50 text-slate-300',
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
  const query = useRejectedSignals(undefined, show);

  const rejected = query.data?.rejected ?? [];
  const columns = [
    {
      key: 'symbol',
      header: 'Symbol',
      sortable: true,
      render: (row: RejectedSignal) => <span className="font-medium text-foreground">{row.symbol}</span>,
    },
    {
      key: 'strategy_source',
      header: 'Strategy',
      sortable: true,
      render: (row: RejectedSignal) => <span className="text-muted-foreground">{row.strategy_source}</span>,
    },
    {
      key: 'reject_stage',
      header: 'Stage',
      sortable: true,
      render: (row: RejectedSignal) => (
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${REJECT_STAGE_COLORS[row.reject_stage] ?? 'bg-muted text-muted-foreground'}`}>
          {row.reject_stage.replaceAll('_', ' ')}
        </span>
      ),
    },
    {
      key: 'reject_reason',
      header: 'Reason',
      render: (row: RejectedSignal) => <span className="text-muted-foreground">{row.reject_reason}</span>,
    },
    {
      key: 'raw_confidence',
      header: 'Confidence',
      sortable: true,
      className: 'text-right',
      render: (row: RejectedSignal) => <span>{formatPct(row.raw_confidence)}</span>,
    },
    {
      key: 'raw_rr',
      header: 'R:R',
      sortable: true,
      className: 'text-right',
      render: (row: RejectedSignal) => <span>{formatRR(row.raw_rr)}</span>,
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => set_show((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          {show ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <div>
            <p className="text-sm font-semibold text-foreground">Rejected signals</p>
            <p className="text-xs text-muted-foreground">See where candidates were filtered out.</p>
          </div>
        </div>
        {show && rejected.length > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {rejected.length}
          </span>
        )}
      </button>

      {show && (
        <div className="border-t border-border px-4 py-4">
          {query.isLoading && <LoadingSkeleton variant="table-row" count={4} />}
          {query.isError && <ErrorState message="Failed to load rejected signals" onRetry={() => { query.refetch(); }} />}
          {!query.isLoading && !query.isError && rejected.length === 0 && (
            <EmptyState
              icon={<Filter className="h-8 w-8" />}
              title="No rejected signals"
              description="Rejected candidates will appear here after a pipeline run."
            />
          )}
          {rejected.length > 0 && (
            <DataTable columns={columns} data={rejected} getRowKey={(row) => row.id} />
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
  const columns = [
    {
      key: 'symbol',
      header: 'Symbol',
      sortable: true,
      render: (row: DecisionHistoryItem) => <span className="font-medium text-foreground">{row.symbol}</span>,
    },
    {
      key: 'direction',
      header: 'Direction',
      sortable: true,
      render: (row: DecisionHistoryItem) => row.direction,
    },
    {
      key: 'decision',
      header: 'Decision',
      sortable: true,
      render: (row: DecisionHistoryItem) => (
        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${DECISION_COLORS[row.decision] ?? 'bg-muted text-muted-foreground'}`}>
          {row.decision}
        </span>
      ),
    },
    {
      key: 'entry_price',
      header: 'Entry',
      sortable: true,
      className: 'text-right',
      render: (row: DecisionHistoryItem) => formatINR(row.entry_price),
    },
    {
      key: 'confidence',
      header: 'Confidence',
      sortable: true,
      className: 'text-right',
      render: (row: DecisionHistoryItem) => formatPct(row.confidence),
    },
    {
      key: 'notes',
      header: 'Notes',
      render: (row: DecisionHistoryItem) => <span className="text-muted-foreground">{row.notes ?? '—'}</span>,
    },
    {
      key: 'signal_status',
      header: 'Status',
      sortable: true,
      render: (row: DecisionHistoryItem) => row.signal_status?.replaceAll('_', ' ') ?? '—',
    },
    {
      key: 'decided_at',
      header: 'Updated',
      sortable: true,
      render: (row: DecisionHistoryItem) => (
        <span className="text-xs text-muted-foreground">{formatDateTime(row.updated_at)}</span>
      ),
    },
  ];

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <button
        type="button"
        onClick={() => set_show((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-4 text-left"
      >
        <div className="flex items-center gap-2">
          {show ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <div>
            <p className="text-sm font-semibold text-foreground">Decision history</p>
            <p className="text-xs text-muted-foreground">Review manual overrides and skipped trades.</p>
          </div>
        </div>
        {show && decisions.length > 0 && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {decisions.length}
          </span>
        )}
      </button>

      {show && (
        <div className="border-t border-border px-4 py-4">
          {query.isLoading && <LoadingSkeleton variant="table-row" count={4} />}
          {query.isError && <ErrorState message="Failed to load decision history" onRetry={() => { query.refetch(); }} />}
          {!query.isLoading && !query.isError && decisions.length === 0 && (
            <EmptyState
              icon={<History className="h-8 w-8" />}
              title="No decisions recorded yet"
              description="Manual trade decisions will appear here once they are saved."
            />
          )}
          {decisions.length > 0 && (
            <DataTable columns={columns} data={decisions} getRowKey={(row) => row.id} />
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
  const total_items = pagination_meta?.total ?? signal_list.length;
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
      <div className="rounded-2xl border border-border bg-card px-5 py-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Signals</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track active opportunities, review the full signal history, and inspect rejected candidates.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-muted px-3 py-1">Active: {active_signals.length}</span>
            <span className="rounded-full bg-muted px-3 py-1">History: {total_items}</span>
            <span className="rounded-full bg-muted px-3 py-1">Page size: {filters.limit ?? PAGINATION.defaultPageSize}</span>
          </div>
        </div>
      </div>

      <SignalFiltersBar filters={filters} on_change={set_filters} />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Active Signals</h2>
            <p className="text-sm text-muted-foreground">
              Current live candidates surfaced by the pipeline.
            </p>
          </div>
        </div>
        {active_query.isLoading && <LoadingSkeleton variant="card" count={4} />}
        {!active_query.isLoading && active_signals.length > 0 && (
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
        )}
        {!active_query.isLoading && active_signals.length === 0 && (
          <EmptyState
            icon={<Zap className="h-8 w-8" />}
            title="No active signals"
            description="New live signals will show up here after the next pipeline run."
          />
        )}
      </div>

      <AllSignalsContent
        is_loading={signals_query.isLoading}
        is_error={signals_query.isError}
        signal_list={signal_list}
        total_items={total_items}
        total_pages={total_pages}
        current_page={current_page}
        filters={filters}
        on_row_click={handle_row_click}
        on_refetch={() => { signals_query.refetch(); }}
        on_filter_change={set_filters}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <RejectedSignalsSection />
        <DecisionHistorySection />
      </div>

      <SignalDetailDrawer
        signal={selected_signal}
        open={drawer_open}
        on_close={handle_close_drawer}
      />
    </div>
  );
}
