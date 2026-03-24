import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const status_styles: Record<string, { dot: string; bg: string; text: string }> = {
  ACTIVE: { dot: 'bg-emerald-400', bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  TARGET_HIT: { dot: 'bg-blue-400', bg: 'bg-blue-500/15', text: 'text-blue-400' },
  SL_HIT: { dot: 'bg-red-400', bg: 'bg-red-500/15', text: 'text-red-400' },
  EXPIRED: { dot: 'bg-zinc-400', bg: 'bg-zinc-500/15', text: 'text-zinc-400' },
  EXPIRED_PENALIZED: { dot: 'bg-amber-400', bg: 'bg-amber-500/15', text: 'text-amber-400' },
  OPEN: { dot: 'bg-amber-400', bg: 'bg-amber-500/15', text: 'text-amber-400' },
  CLOSED: { dot: 'bg-zinc-400', bg: 'bg-zinc-500/15', text: 'text-zinc-400' },
};

const default_style = { dot: 'bg-zinc-400', bg: 'bg-zinc-500/15', text: 'text-zinc-400' };

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = status_styles[status] ?? default_style;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        style.bg,
        style.text,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
      {status === 'EXPIRED_PENALIZED' ? 'Expired (penalized)' : status.split('_').join(' ')}
    </span>
  );
}
