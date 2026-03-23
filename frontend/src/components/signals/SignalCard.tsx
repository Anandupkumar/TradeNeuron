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
        'rounded-lg border border-zinc-800 bg-zinc-900 p-4 transition-colors hover:border-zinc-700',
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Link
            to={`/stock/${encodeSymbol(signal.symbol)}`}
            className="text-base font-bold text-zinc-50 hover:text-emerald-400 transition-colors"
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
              : 'text-zinc-600 hover:text-zinc-400',
          )}
        />
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Confidence</span>
          <span className="font-medium text-zinc-200">{Math.round(signal.confidence)}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className={cn('h-full rounded-full transition-all', confidence_color)}
            style={{ width: `${Math.min(signal.confidence, 100)}%` }}
          />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-zinc-500">Entry</p>
          <p className="font-medium text-zinc-200">{formatINR(signal.entry_price)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">Target</p>
          <p className="font-medium text-emerald-400">{formatINR(signal.target_price)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500">SL</p>
          <p className="font-medium text-red-400">{formatINR(signal.stop_loss)}</p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 font-medium text-zinc-300">
            R:R {formatRR(signal.risk_reward)}
          </span>
          <span>{signal.strategy_source.replaceAll('_', ' ')}</span>
        </div>
        <span>{formatDate(signal.date)}</span>
      </div>
    </div>
  );
}
