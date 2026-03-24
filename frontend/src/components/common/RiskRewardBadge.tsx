import { cn } from '@/lib/utils';
import { toNum } from '../../utils/format';

interface RiskRewardBadgeProps {
  value: number | string;
}

export function RiskRewardBadge({ value: raw_value }: RiskRewardBadgeProps) {
  const value = toNum(raw_value) ?? 0;
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
