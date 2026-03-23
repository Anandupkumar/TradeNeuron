import { cn } from '@/lib/utils';

interface ConfidenceBarProps {
  value: number;
}

export function ConfidenceBar({ value }: ConfidenceBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const fill_color =
    clamped < 40 ? 'bg-red-500' : clamped < 70 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded bg-zinc-800">
        <div
          className={cn('h-full rounded transition-all', fill_color)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs font-medium text-zinc-300">{clamped}</span>
    </div>
  );
}
