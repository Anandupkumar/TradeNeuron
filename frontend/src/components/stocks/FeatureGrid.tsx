import { Check, X as XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPct, formatINR, formatRR, toNum } from '../../utils/format';
import type { StockFeatures, RsiZone, VolumeTier } from '../../types';

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

const volume_tier_styles: Record<VolumeTier, string> = {
  LOW: 'bg-zinc-700/50 text-zinc-400',
  NORMAL: 'bg-blue-500/20 text-blue-400',
  HIGH: 'bg-amber-500/20 text-amber-400',
  VERY_HIGH: 'bg-orange-500/20 text-orange-400',
  EXTREME: 'bg-red-500/20 text-red-400',
};

const volume_tier_labels: Record<VolumeTier, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  VERY_HIGH: 'Very High',
  EXTREME: 'Extreme',
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

function numericCard(label: string, raw_value: number | string | null, formatter: (v: number) => string) {
  const value = toNum(raw_value);
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

      {numericCard('Z-Score (20D)', features.z_score_20d, (v) => (toNum(v) ?? 0).toFixed(2))}
      {numericCard('Dist. 52W High', features.distance_from_52w_high_pct, (v) =>
        formatPct(v, true),
      )}
      {numericCard('RS vs Nifty', features.relative_strength_vs_nifty, (v) => (toNum(v) ?? 0).toFixed(3))}

      {numericCard('RVOL', features.rvol, (v) => formatRR(v))}

      {features.volume_tier != null && (
        <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 p-3">
          <span className="text-sm text-zinc-300">Volume Tier</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              volume_tier_styles[features.volume_tier],
            )}
          >
            {volume_tier_labels[features.volume_tier]}
          </span>
        </div>
      )}

      {numericCard('VWAP', features.vwap, (v) => formatINR(v))}
      {numericCard('VWAP Distance', features.vwap_distance_pct, (v) => formatPct(v, true))}
      {booleanPill(features.is_near_vwap, 'Near VWAP')}
      {booleanPill(features.is_high_delivery, 'High Delivery')}
      {numericCard('Delivery %', features.delivery_pct, (v) => formatPct(v))}
    </div>
  );
}
