import { Check, X as XIcon, TrendingUp, TrendingDown } from 'lucide-react';
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
  NEUTRAL: 'bg-muted/50 text-muted-foreground',
  OVERBOUGHT: 'bg-red-500/20 text-red-400',
};

const volume_tier_styles: Record<VolumeTier, string> = {
  LOW: 'bg-muted/50 text-muted-foreground',
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
    <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
      <span className="text-sm text-muted-foreground">{label}</span>
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
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{display}</p>
    </div>
  );
}

export function FeatureGrid({ features, className }: FeatureGridProps) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4', className)}>
      {booleanPill(features.is_uptrend, 'Uptrend')}

      <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
        <span className="text-sm text-muted-foreground">RSI Zone</span>
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

      {features.close_position != null && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
          <span className="text-sm text-muted-foreground">Breakout Strength</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              features.close_position >= 0.75
                ? 'bg-emerald-500/20 text-emerald-400'
                : features.close_position >= 0.6
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-muted/50 text-muted-foreground',
            )}
          >
            {features.close_position >= 0.75
              ? 'Strong'
              : features.close_position >= 0.6
                ? 'Moderate'
                : 'Weak'}
          </span>
        </div>
      )}

      {features.ema50_slope != null && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
          <span className="text-sm text-muted-foreground">EMA50 Trend</span>
          <span
            className={cn(
              'flex items-center gap-1 text-sm font-medium',
              features.ema50_slope > 0 ? 'text-emerald-400' : 'text-red-400',
            )}
          >
            {features.ema50_slope > 0 ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            {features.ema50_slope > 0 ? '+' : ''}
            {(toNum(features.ema50_slope) ?? 0).toFixed(2)}
          </span>
        </div>
      )}

      {booleanPill(features.near_support, 'Near Support')}
      {booleanPill(features.is_ranging, 'Ranging')}

      {numericCard('Z-Score (20D)', features.z_score_20d, (v) => (toNum(v) ?? 0).toFixed(2))}
      {numericCard('Dist. 52W High', features.distance_from_52w_high_pct, (v) =>
        formatPct(v, true),
      )}
      {numericCard('RS vs Nifty', features.relative_strength_vs_nifty, (v) => (toNum(v) ?? 0).toFixed(3))}

      {numericCard('RVOL', features.rvol, (v) => formatRR(v))}

      {features.volume_tier != null && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
          <span className="text-sm text-muted-foreground">Volume Tier</span>
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
