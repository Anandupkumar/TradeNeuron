import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate, formatINR } from '../../utils/format';
import { SignalBadge } from '../signals/SignalBadge';
import type { StockDetail } from '../../types';

interface StockHeaderProps {
  stock: StockDetail;
  on_favorite_toggle?: () => void;
  favorite_disabled?: boolean;
  className?: string;
}

export function StockHeader({ stock, on_favorite_toggle, favorite_disabled = false, className }: StockHeaderProps) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-5 shadow-sm', className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">{stock.symbol}</h1>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {stock.sector}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-3xl font-semibold text-foreground">
            {formatINR(stock.latest_candle.adjusted_close)}
          </span>

          {stock.active_signal && (
            <SignalBadge
              signal_type={stock.active_signal.signal_type}
              direction={stock.active_signal.direction}
            />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Latest session: {formatDate(stock.latest_candle.date)}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={favorite_disabled || !on_favorite_toggle}
          aria-label={stock.is_favorite ? 'Remove from watchlist' : 'Add to watchlist'}
          onClick={on_favorite_toggle}
          className={cn(
            'rounded-md p-2 transition-colors',
            stock.is_favorite
              ? 'bg-amber-500/15 text-amber-400'
              : 'bg-muted text-muted-foreground hover:text-muted-foreground',
            (favorite_disabled || !on_favorite_toggle) && 'cursor-not-allowed opacity-60',
          )}
        >
          <Star className={cn('h-5 w-5', stock.is_favorite && 'fill-amber-400')} />
        </button>
      </div>
      </div>
    </div>
  );
}
