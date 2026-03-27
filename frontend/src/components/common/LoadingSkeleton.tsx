import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  variant: 'card' | 'table-row' | 'chart' | 'text';
  count?: number;
}

function skeletonBlock({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-muted', className)} />;
}

function cardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {skeletonBlock({ className: 'h-3 w-24 mb-3' })}
      {skeletonBlock({ className: 'h-7 w-32 mb-2' })}
      {skeletonBlock({ className: 'h-3 w-20' })}
    </div>
  );
}

function tableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-border px-4 py-3">
      {skeletonBlock({ className: 'h-4 w-24' })}
      {skeletonBlock({ className: 'h-4 w-16' })}
      {skeletonBlock({ className: 'h-4 w-20' })}
      {skeletonBlock({ className: 'h-4 w-14' })}
    </div>
  );
}

function chartSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      {skeletonBlock({ className: 'h-48 w-full' })}
    </div>
  );
}

function textSkeleton() {
  return (
    <div className="space-y-2">
      {skeletonBlock({ className: 'h-3 w-full' })}
      {skeletonBlock({ className: 'h-3 w-4/5' })}
      {skeletonBlock({ className: 'h-3 w-3/5' })}
    </div>
  );
}

const variant_map = {
  card: cardSkeleton,
  'table-row': tableRowSkeleton,
  chart: chartSkeleton,
  text: textSkeleton,
};

export function LoadingSkeleton({ variant, count = 1 }: LoadingSkeletonProps) {
  const renderer = variant_map[variant];
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i}>{renderer()}</div>
      ))}
    </div>
  );
}
