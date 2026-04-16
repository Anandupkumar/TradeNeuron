import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  sub_text?: string;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function StatCard({ label, value, sub_text, trend, className }: StatCardProps) {
  const trend_icon =
    trend === 'up' ? (
      <TrendingUp className="h-4 w-4 text-emerald-500" />
    ) : trend === 'down' ? (
      <TrendingDown className="h-4 w-4 text-red-500" />
    ) : null;

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 shadow-sm', className)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-2xl font-semibold tracking-tight text-foreground">{value}</span>
        {trend_icon}
      </div>
      {sub_text && <p className="mt-1 text-xs text-muted-foreground">{sub_text}</p>}
    </div>
  );
}
