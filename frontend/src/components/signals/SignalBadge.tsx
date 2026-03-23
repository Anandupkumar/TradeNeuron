import { cn } from '@/lib/utils';
import { featureFlags } from '../../utils/featureFlags';

interface SignalBadgeProps {
  signal_type: 'BUY' | 'SELL';
  direction?: 'LONG' | 'SHORT';
  className?: string;
}

const type_styles: Record<string, string> = {
  BUY: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  SELL: 'bg-red-500/20 text-red-400 border-red-500/30',
};

export function SignalBadge({ signal_type, direction, className }: SignalBadgeProps) {
  const show_direction = direction && featureFlags.showShortDirection();
  const label = show_direction ? `${signal_type} ${direction}` : signal_type;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        type_styles[signal_type],
        className,
      )}
    >
      {label}
    </span>
  );
}
