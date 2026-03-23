import { cn } from '@/lib/utils';

interface MarketRegimeBadgeProps {
  regime: 'BULLISH' | 'SIDEWAYS' | 'BEARISH' | 'HIGH_VOLATILITY';
}

const regime_styles: Record<MarketRegimeBadgeProps['regime'], string> = {
  BULLISH: 'bg-emerald-500/10 text-emerald-400',
  BEARISH: 'bg-red-500/10 text-red-400',
  SIDEWAYS: 'bg-amber-500/10 text-amber-400',
  HIGH_VOLATILITY: 'bg-purple-500/10 text-purple-400',
};

const regime_labels: Record<MarketRegimeBadgeProps['regime'], string> = {
  BULLISH: 'Bullish',
  BEARISH: 'Bearish',
  SIDEWAYS: 'Sideways',
  HIGH_VOLATILITY: 'High Volatility',
};

export function MarketRegimeBadge({ regime }: MarketRegimeBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        regime_styles[regime]
      )}
    >
      {regime_labels[regime]}
    </span>
  );
}
