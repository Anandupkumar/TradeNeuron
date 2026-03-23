import { useState } from 'react';
import { Zap } from 'lucide-react';
import { useSignalFilters } from '../hooks/useFilterUrlSync';
import { useSignals } from '../hooks/useSignals';
import { useActiveSignals } from '../hooks/useActiveSignals';
import { SignalFilters as SignalFiltersBar } from '../components/signals/SignalFilters';
import { SignalCard } from '../components/signals/SignalCard';
import { SignalTable } from '../components/signals/SignalTable';
import { SignalDetailDrawer } from '../components/signals/SignalDetailDrawer';
import { Pagination } from '../components/common/Pagination';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import type { Signal, SignalFilters } from '../types';

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

function allSignalsContent(props: AllSignalsContentProps) {
  if (props.is_loading) return LoadingSkeleton({ variant: 'table-row', count: 8 });

  if (props.is_error) {
    return ErrorState({ message: 'Failed to load signals', onRetry: props.on_refetch });
  }

  if (props.signal_list.length === 0) {
    return EmptyState({
      icon: <Zap className="h-8 w-8" />,
      title: 'No signals found',
      description: 'Try adjusting your filters or wait for the next pipeline run.',
    });
  }

  return (
    <>
      {SignalTable({ signals: props.signal_list, on_row_click: props.on_row_click })}
      {props.total_pages > 1 && (
        <div className="pt-2">
          {Pagination({
            page: props.current_page,
            total_pages: props.total_pages,
            onPageChange: (page: number) => props.on_filter_change({ page }),
            page_sizes: [10, 20, 50],
            current_size: props.filters.limit ?? 20,
            onPageSizeChange: (size: number) => props.on_filter_change({ limit: size, page: 1 }),
          })}
        </div>
      )}
    </>
  );
}

export default function signalsPage() {
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
        <h1 className="text-2xl font-bold text-zinc-50">Signals</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Browse and filter trade signals
          {pagination_meta && ` · ${pagination_meta.total} total`}
        </p>
      </div>

      {SignalFiltersBar({ filters, on_change: set_filters })}

      {active_signals.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-zinc-200">
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
                {SignalCard({ signal })}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-base font-semibold text-zinc-200">All Signals</h2>
        {allSignalsContent({
          is_loading: signals_query.isLoading,
          is_error: signals_query.isError,
          signal_list,
          total_pages,
          current_page,
          filters,
          on_row_click: handle_row_click,
          on_refetch: () => { signals_query.refetch(); },
          on_filter_change: set_filters,
        })}
      </div>

      {SignalDetailDrawer({
        signal: selected_signal,
        open: drawer_open,
        on_close: handle_close_drawer,
      })}
    </div>
  );
}
