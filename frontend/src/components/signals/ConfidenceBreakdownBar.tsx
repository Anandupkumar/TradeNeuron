import { cn } from '@/lib/utils';
import type { ConfidenceBreakdown } from '../../types';

interface Props {
  breakdown: ConfidenceBreakdown | null;
  confidence: number;
}

const SEGMENTS: { key: keyof ConfidenceBreakdown; label: string; color: string }[] = [
  { key: 'technical', label: 'Technical', color: 'bg-blue-500' },
  { key: 'momentum', label: 'Momentum', color: 'bg-emerald-500' },
  { key: 'volume', label: 'Volume', color: 'bg-amber-500' },
  { key: 'quality', label: 'Quality', color: 'bg-purple-500' },
];

export function ConfidenceBreakdownBar({ breakdown, confidence }: Props) {
  if (!breakdown) {
    let bar_color = 'bg-red-500';
    if (confidence >= 80) bar_color = 'bg-emerald-500';
    else if (confidence >= 70) bar_color = 'bg-amber-500';

    return (
      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Confidence</span>
          <span className="font-semibold text-foreground">{Math.round(confidence)}%</span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all', bar_color)}
            style={{ width: `${Math.min(confidence, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  const total = breakdown.technical + breakdown.momentum + breakdown.volume + breakdown.quality;
  const max_display = Math.max(total, 100);

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Confidence Breakdown</span>
        <span className="font-semibold text-foreground">{Math.round(confidence)}%</span>
      </div>

      <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {SEGMENTS.map(({ key, color }) => {
          const val = breakdown[key];
          if (val <= 0) return null;
          return (
            <div
              key={key}
              className={cn('h-full first:rounded-l-full last:rounded-r-full', color)}
              style={{ width: `${(val / max_display) * 100}%` }}
            />
          );
        })}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
        {SEGMENTS.map(({ key, label, color }) => (
          <div key={key} className="flex items-center gap-2 text-xs">
            <span className={cn('inline-block h-2.5 w-2.5 rounded-sm', color)} />
            <span className="text-muted-foreground">{label}</span>
            <span className="ml-auto font-medium text-foreground">{breakdown[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
