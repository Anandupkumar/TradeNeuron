import { Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExecutionType } from '../../types/signal.types';

interface ExecutionBadgeProps {
  execution_type: ExecutionType;
  className?: string;
}

const type_labels: Record<ExecutionType, string> = {
  EQUITY: 'Equity',
  FUTURES: 'Futures',
  OPTIONS: 'Options',
  NONE: 'Not Executable',
};

export function ExecutionBadge({ execution_type, className }: ExecutionBadgeProps) {
  const is_none = execution_type === 'NONE';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
        is_none
          ? 'border-orange-500/30 bg-orange-500/10 text-orange-400'
          : 'border-border bg-muted text-muted-foreground',
        className,
      )}
      title={is_none ? 'SHORT signal cannot be executed in equity-only account' : `Execution: ${type_labels[execution_type]}`}
    >
      {is_none && <Ban className="h-3 w-3" />}
      {type_labels[execution_type]}
    </span>
  );
}
