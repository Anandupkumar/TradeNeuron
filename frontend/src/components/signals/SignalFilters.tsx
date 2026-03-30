import { Search, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { featureFlags } from '../../utils/featureFlags';
import { useDebounce } from '../../hooks/useDebounce';
import { useState, useEffect } from 'react';
import type { SignalFilters } from '../../types';

interface SignalFiltersProps {
  filters: SignalFilters;
  on_change: (updates: Partial<SignalFilters>) => void;
  className?: string;
}

const status_options = [
  { value: 'all', label: 'All Statuses' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'TARGET_HIT', label: 'Target Hit' },
  { value: 'SL_HIT', label: 'SL Hit' },
  { value: 'EXPIRED', label: 'Expired' },
];

const direction_options = [
  { value: 'all', label: 'All Directions' },
  { value: 'LONG', label: 'Long' },
  { value: 'SHORT', label: 'Short' },
];

const tier_options = [
  { value: 'all', label: 'All Priority' },
  { value: 'HIGH', label: 'High Priority' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW', label: 'Low Priority' },
];

const select_classes =
  'rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring';

export function SignalFilters({ filters, on_change, className }: SignalFiltersProps) {
  const [symbol_input, set_symbol_input] = useState(filters.symbol ?? '');
  const [debounced_symbol] = useDebounce(symbol_input, 400);

  useEffect(() => {
    if (debounced_symbol !== (filters.symbol ?? '')) {
      on_change({ symbol: debounced_symbol || undefined });
    }
  }, [debounced_symbol]);

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id="symbol-search"
          type="text"
          placeholder="Search symbol…"
          value={symbol_input}
          onChange={(e) => set_symbol_input(e.target.value)}
          className="rounded-md border border-border bg-muted py-2 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="flex rounded-lg border border-border bg-muted p-0.5">
        {status_options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => on_change({ status: opt.value as SignalFilters['status'] })}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              (filters.status ?? 'all') === opt.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {featureFlags.showDirectionFilter() && (
        <select
          value={filters.direction ?? 'all'}
          onChange={(e) => on_change({ direction: e.target.value as SignalFilters['direction'] })}
          className={select_classes}
        >
          {direction_options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}

      <select
        value={filters.confidence_tier ?? 'all'}
        onChange={(e) => on_change({ confidence_tier: e.target.value as SignalFilters['confidence_tier'] })}
        className={select_classes}
      >
        {tier_options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-2">
        <label htmlFor="confidence-slider" className="text-xs text-muted-foreground">
          Min Confidence
        </label>
        <input
          id="confidence-slider"
          type="range"
          min={0}
          max={100}
          step={5}
          value={filters.min_confidence ?? 0}
          onChange={(e) => on_change({ min_confidence: Number(e.target.value) })}
          className="h-1.5 w-24 accent-emerald-500"
        />
        <span className="min-w-[2.5rem] text-xs font-medium text-muted-foreground">
          {filters.min_confidence ?? 0}%
        </span>
      </div>

      <button
        onClick={() => on_change({ favorites_only: !filters.favorites_only })}
        className={cn(
          'flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors',
          filters.favorites_only
            ? 'border-amber-500/50 bg-amber-500/15 text-amber-400'
            : 'border-border bg-muted text-muted-foreground hover:text-foreground',
        )}
      >
        <Star className={cn('h-3.5 w-3.5', filters.favorites_only && 'fill-amber-400')} />
        Favorites
      </button>
    </div>
  );
}
