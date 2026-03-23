import { cn } from '@/lib/utils';

interface RiskRewardBadgeProps {
  value: number;
}

export function RiskRewardBadge({ value }: RiskRewardBadgeProps) {
  const color_classes =
    value < 1
      ? 'bg-red-500/10 text-red-400'
      : value <= 2
        ? 'bg-amber-500/10 text-amber-400'
        : 'bg-emerald-500/10 text-emerald-400';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        color_classes
      )}
    >
      {value.toFixed(2)}x
    </span>
  );
}
