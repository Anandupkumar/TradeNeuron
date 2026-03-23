import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatINR } from '../../utils/format';
import { SignalBadge } from '../signals/SignalBadge';
import type { StockDetail } from '../../types';

interface StockHeaderProps {
  stock: StockDetail;
  on_favorite_toggle?: () => void;
  className?: string;
}

export function StockHeader({ stock, on_favorite_toggle, className }: StockHeaderProps) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-4', className)}>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-zinc-50">{stock.symbol}</h1>
          <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-300">
            {stock.sector}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-3xl font-semibold text-zinc-50">
            {formatINR(stock.latest_candle.close)}
          </span>

          {stock.active_signal && (
            <SignalBadge
              signal_type={stock.active_signal.signal_type}
              direction={stock.active_signal.direction}
            />
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={on_favorite_toggle}
          className={cn(
            'rounded-md p-2 transition-colors',
            stock.is_favorite
              ? 'bg-amber-500/15 text-amber-400'
              : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300',
          )}
        >
          <Star className={cn('h-5 w-5', stock.is_favorite && 'fill-amber-400')} />
        </button>
      </div>
    </div>
  );
}
