import { ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toNum } from '../../utils/format';

interface PriceChangeProps {
  value: number | string;
  format?: 'pct' | 'inr';
}

export function PriceChange({ value: raw_value, format = 'pct' }: PriceChangeProps) {
  const value = toNum(raw_value) ?? 0;
  const is_positive = value > 0;
  const is_negative = value < 0;

  const color = is_positive
    ? 'text-emerald-500'
    : is_negative
      ? 'text-red-500'
      : 'text-zinc-400';

  const formatted =
    format === 'pct'
      ? `${is_positive ? '+' : ''}${value.toFixed(2)}%`
      : `${is_positive ? '+' : ''}₹${Math.abs(value).toFixed(2)}`;

  const display_value =
    format === 'inr' && is_negative ? `-₹${Math.abs(value).toFixed(2)}` : formatted;

  return (
    <span className={cn('inline-flex items-center gap-0.5 text-sm font-medium', color)}>
      {is_positive && <ArrowUp className="h-3 w-3" />}
      {is_negative && <ArrowDown className="h-3 w-3" />}
      {display_value}
    </span>
  );
}
