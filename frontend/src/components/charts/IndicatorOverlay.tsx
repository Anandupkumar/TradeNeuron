import { cn } from '@/lib/utils';
import { toNum } from '../../utils/format';

interface IndicatorOverlayProps {
  indicators: {
    ema_20?: number | string | null;
    ema_50?: number | string | null;
    ema_200?: number | string | null;
    rsi?: number | string | null;
  };
  className?: string;
}

function getRsiColor(rsi: number): string {
  if (rsi <= 30) return 'text-red-400';
  if (rsi <= 45) return 'text-amber-400';
  if (rsi <= 55) return 'text-zinc-400';
  if (rsi <= 70) return 'text-emerald-400';
  return 'text-red-400';
}

function getRsiLabel(rsi: number): string {
  if (rsi <= 30) return 'Oversold';
  if (rsi <= 45) return 'Pullback';
  if (rsi <= 55) return 'Neutral';
  if (rsi <= 70) return 'Healthy';
  return 'Overbought';
}

export function IndicatorOverlay({ indicators, className }: IndicatorOverlayProps) {
  const ema_items = [
    { label: 'EMA 20', value: toNum(indicators.ema_20), color: 'bg-cyan-500' },
    { label: 'EMA 50', value: toNum(indicators.ema_50), color: 'bg-yellow-500' },
    { label: 'EMA 200', value: toNum(indicators.ema_200), color: 'bg-purple-500' },
  ];

  const rsi = toNum(indicators.rsi);

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md bg-zinc-900/80 px-3 py-2 text-xs backdrop-blur',
        className,
      )}
    >
      {ema_items.map(
        (item) =>
          item.value != null && (
            <span key={item.label} className="flex items-center gap-1.5 text-zinc-300">
              <span className={cn('inline-block h-2 w-2 rounded-full', item.color)} />
              {item.label}:&nbsp;
              <span className="font-medium text-zinc-100">
                {typeof item.value === 'number' ? item.value.toFixed(2) : '—'}
              </span>
            </span>
          ),
      )}
      {rsi != null && (
        <span className="flex items-center gap-1.5 text-zinc-300">
          <span className="inline-block h-2 w-2 rounded-full bg-zinc-500" />
          RSI:&nbsp;
          <span className={cn('font-medium', getRsiColor(rsi))}>
            {typeof rsi === 'number' ? rsi.toFixed(1) : '—'}
          </span>
          <span className={cn('text-[10px]', getRsiColor(rsi))}>
            ({getRsiLabel(rsi)})
          </span>
        </span>
      )}
    </div>
  );
}
