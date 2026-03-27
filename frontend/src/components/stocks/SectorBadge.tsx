import { cn } from '@/lib/utils';

interface SectorBadgeProps {
  sector: string;
  className?: string;
}

export function SectorBadge({ sector, className }: SectorBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground',
        className,
      )}
    >
      {sector}
    </span>
  );
}
