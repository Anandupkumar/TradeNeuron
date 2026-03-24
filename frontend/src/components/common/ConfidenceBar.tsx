import { cn } from '@/lib/utils';
import type { ConfidenceTier } from '../../types/signal.types';

interface ConfidenceBarProps {
  value: number;
  tier?: ConfidenceTier | null;
}

const tier_styles: Record<string, { bg: string; text: string; label: string }> = {
  HIGH: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'High' },
  NORMAL: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Normal' },
  LOW: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Low' },
};

export function ConfidenceBar({ value, tier }: ConfidenceBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const fill_color =
    clamped < 40 ? 'bg-red-500' : clamped < 70 ? 'bg-amber-500' : 'bg-emerald-500';

  const tier_info = tier ? tier_styles[tier] : null;

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded bg-zinc-800">
        <div
          className={cn('h-full rounded transition-all', fill_color)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs font-medium text-zinc-300">{clamped}</span>
      {tier_info && (
        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', tier_info.bg, tier_info.text)}>
          {tier_info.label}
        </span>
      )}
    </div>
  );
}
