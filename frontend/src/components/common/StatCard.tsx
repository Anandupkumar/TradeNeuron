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
    <div className={cn('bg-zinc-900 border border-zinc-800 rounded-lg p-4', className)}>
      <p className="text-sm text-zinc-400">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-2xl font-semibold text-zinc-50">{value}</span>
        {trend_icon}
      </div>
      {sub_text && <p className="mt-1 text-xs text-zinc-500">{sub_text}</p>}
    </div>
  );
}
