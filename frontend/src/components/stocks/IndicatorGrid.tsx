import { cn } from '@/lib/utils';
import { formatINR, formatPct } from '../../utils/format';
import type { StockIndicators } from '../../types';

interface IndicatorGridProps {
  indicators: StockIndicators;
  className?: string;
}

interface IndicatorCardData {
  label: string;
  value: number | null;
  formatter: (v: number) => string;
  color_fn?: (v: number) => string;
}

function rsiColor(v: number): string {
  if (v <= 30) return 'text-emerald-400';
  if (v >= 70) return 'text-red-400';
  return 'text-zinc-200';
}

export function IndicatorGrid({ indicators, className }: IndicatorGridProps) {
  const cards: IndicatorCardData[] = [
    { label: 'EMA 20', value: indicators.ema_20, formatter: formatINR },
    { label: 'EMA 50', value: indicators.ema_50, formatter: formatINR },
    { label: 'EMA 200', value: indicators.ema_200, formatter: formatINR },
    {
      label: 'RSI',
      value: indicators.rsi,
      formatter: (v) => v.toFixed(2),
      color_fn: rsiColor,
    },
    {
      label: 'MACD Line',
      value: indicators.macd_line,
      formatter: (v) => v.toFixed(4),
    },
    {
      label: 'MACD Signal',
      value: indicators.macd_signal,
      formatter: (v) => v.toFixed(4),
    },
    {
      label: 'MACD Histogram',
      value: indicators.macd_histogram,
      formatter: (v) => v.toFixed(4),
      color_fn: (v) => (v >= 0 ? 'text-emerald-400' : 'text-red-400'),
    },
    { label: 'ATR', value: indicators.atr, formatter: formatINR },
    {
      label: 'Volume Change',
      value: indicators.volume_change,
      formatter: (v) => formatPct(v, true),
      color_fn: (v) => (v >= 0 ? 'text-emerald-400' : 'text-red-400'),
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4', className)}>
      {cards.map((card) => {
        const val = card.value;
        const formatted = val == null ? '—' : card.formatter(val);
        const color = val == null || !card.color_fn ? 'text-zinc-200' : card.color_fn(val);

        return (
          <div
            key={card.label}
            className="rounded-lg border border-zinc-800 bg-zinc-900 p-3"
          >
            <p className="text-xs text-zinc-500">{card.label}</p>
            <p className={cn('mt-1 text-lg font-semibold', color)}>{formatted}</p>
          </div>
        );
      })}
    </div>
  );
}
