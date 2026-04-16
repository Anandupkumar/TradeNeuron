import { cn } from '@/lib/utils';
import { formatINR, formatPct, toNum } from '../../utils/format';
import type { StockIndicators, StockFeatures } from '../../types';

interface IndicatorGridProps {
  indicators: StockIndicators;
  features?: StockFeatures | null;
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
  return 'text-foreground';
}

function slopeColor(v: number): string {
  return v > 0 ? 'text-emerald-400' : 'text-red-400';
}

function formatSlope(v: number): string {
  const sign = v > 0 ? '+' : '';
  return `${sign}${v.toFixed(2)}`;
}

export function IndicatorGrid({ indicators, features, className }: IndicatorGridProps) {
  const cards: IndicatorCardData[] = [
    { label: 'EMA 20', value: toNum(indicators.ema_20), formatter: formatINR },
    { label: 'EMA 50', value: toNum(indicators.ema_50), formatter: formatINR },
    {
      label: 'EMA50 Slope',
      value: features?.ema50_slope != null ? toNum(features.ema50_slope) : null,
      formatter: formatSlope,
      color_fn: slopeColor,
    },
    { label: 'EMA 200', value: toNum(indicators.ema_200), formatter: formatINR },
    {
      label: 'RSI',
      value: toNum(indicators.rsi),
      formatter: (v) => (toNum(v) ?? 0).toFixed(2),
      color_fn: rsiColor,
    },
    {
      label: 'MACD Line',
      value: toNum(indicators.macd_line),
      formatter: (v) => (toNum(v) ?? 0).toFixed(4),
    },
    {
      label: 'MACD Signal',
      value: toNum(indicators.macd_signal),
      formatter: (v) => (toNum(v) ?? 0).toFixed(4),
    },
    {
      label: 'MACD Histogram',
      value: toNum(indicators.macd_histogram),
      formatter: (v) => (toNum(v) ?? 0).toFixed(4),
      color_fn: (v) => (v >= 0 ? 'text-emerald-400' : 'text-red-400'),
    },
    { label: 'ATR', value: toNum(indicators.atr), formatter: formatINR },
    {
      label: 'Volume Change',
      value: toNum(indicators.volume_change),
      formatter: (v) => formatPct(v, true),
      color_fn: (v) => (v >= 0 ? 'text-emerald-400' : 'text-red-400'),
    },
  ];

  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4', className)}>
      {cards.map((card) => {
        const val = card.value;
        const formatted = val == null ? '—' : card.formatter(val);
        const color = val == null || !card.color_fn ? 'text-foreground' : card.color_fn(val);

        return (
          <div
            key={card.label}
            className="rounded-lg border border-border bg-background/40 p-3"
          >
            <p className="text-xs text-muted-foreground">{card.label}</p>
            <p className={cn('mt-1 text-lg font-semibold tracking-tight', color)}>{formatted}</p>
          </div>
        );
      })}
    </div>
  );
}
