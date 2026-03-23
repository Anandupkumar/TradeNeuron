import { Check, X as XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPct } from '../../utils/format';
import type { StockFeatures, RsiZone } from '../../types';

interface FeatureGridProps {
  features: StockFeatures;
  className?: string;
}

const rsi_zone_styles: Record<RsiZone, string> = {
  OVERSOLD: 'bg-emerald-500/20 text-emerald-400',
  PULLBACK: 'bg-blue-500/20 text-blue-400',
  NEUTRAL: 'bg-zinc-700/50 text-zinc-300',
  OVERBOUGHT: 'bg-red-500/20 text-red-400',
};

function booleanPill(value: boolean, label: string) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <span className="text-sm text-zinc-300">{label}</span>
      {value ? (
        <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
          <Check className="h-3 w-3" />
          Yes
        </span>
      ) : (
        <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
          <XIcon className="h-3 w-3" />
          No
        </span>
      )}
    </div>
  );
}

function numericCard(label: string, value: number | null, formatter: (v: number) => string) {
  const display = value == null ? '—' : formatter(value);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-zinc-200">{display}</p>
    </div>
  );
}

export function FeatureGrid({ features, className }: FeatureGridProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4', className)}>
      {booleanPill(features.is_uptrend, 'Uptrend')}

      <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-3">
        <span className="text-sm text-zinc-300">RSI Zone</span>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            rsi_zone_styles[features.rsi_zone],
          )}
        >
          {features.rsi_zone}
        </span>
      </div>

      {booleanPill(features.is_volume_spike, 'Volume Spike')}
      {booleanPill(features.is_breakout, 'Breakout')}
      {booleanPill(features.near_support, 'Near Support')}
      {booleanPill(features.is_liquid, 'Liquid')}
      {booleanPill(features.is_ranging, 'Ranging')}

      {numericCard('Z-Score (20D)', features.z_score_20d, (v) => v.toFixed(2))}
      {numericCard('Dist. 52W High', features.distance_from_52w_high_pct, (v) =>
        formatPct(v, true),
      )}
      {numericCard('RS vs Nifty', features.relative_strength_vs_nifty, (v) => v.toFixed(3))}
    </div>
  );
}
