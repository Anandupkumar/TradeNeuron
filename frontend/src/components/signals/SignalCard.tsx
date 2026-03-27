import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatINR, formatDate, formatRR } from '../../utils/format';
import { encodeSymbol } from '../../utils/symbols';
import { SignalBadge } from './SignalBadge';
import { StatusBadge } from '../common/StatusBadge';
import type { Signal } from '../../types';

interface SignalCardProps {
  signal: Signal;
  className?: string;
}

export function SignalCard({ signal, className }: SignalCardProps) {
  let confidence_color = 'bg-red-500';
  if (signal.confidence >= 80) confidence_color = 'bg-emerald-500';
  else if (signal.confidence >= 70) confidence_color = 'bg-amber-500';

  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-lg border border-border bg-card p-4 transition-colors hover:border-border',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            to={`/stock/${encodeSymbol(signal.symbol)}`}
            className="text-base font-bold text-foreground hover:text-emerald-400 transition-colors"
          >
            {signal.symbol}
          </Link>
          {SignalBadge({ signal_type: signal.signal_type, direction: signal.direction })}
          {StatusBadge({ status: signal.status })}
        </div>
        <Star
          className={cn(
            'h-4 w-4 shrink-0 cursor-pointer',
            signal.is_favorite
              ? 'fill-amber-400 text-amber-400'
              : 'text-muted-foreground hover:text-muted-foreground',
          )}
        />
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Confidence</span>
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-foreground">{Math.round(signal.confidence)}%</span>
            {signal.confidence_tier && (
              <span className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-medium',
                signal.confidence_tier === 'HIGH' ? 'bg-emerald-500/15 text-emerald-400' :
                signal.confidence_tier === 'NORMAL' ? 'bg-blue-500/15 text-blue-400' :
                'bg-amber-500/15 text-amber-400',
              )}>
                {signal.confidence_tier === 'HIGH' ? 'High' : signal.confidence_tier === 'NORMAL' ? 'Normal' : 'Low'}
              </span>
            )}
          </div>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all', confidence_color)}
            style={{ width: `${Math.min(signal.confidence, 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Entry</p>
          <p className="font-medium text-foreground">{formatINR(signal.entry_price)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Target</p>
          <p className="font-medium text-emerald-400">{formatINR(signal.target_price)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">SL</p>
          <p className="font-medium text-red-400">{formatINR(signal.stop_loss)}</p>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="rounded bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">
            R:R {formatRR(signal.risk_reward)}
          </span>
          <span className="truncate">{signal.strategy_source.replaceAll('_', ' ')}</span>
        </div>
        <span className="shrink-0">{formatDate(signal.date)}</span>
      </div>
    </div>
  );
}
