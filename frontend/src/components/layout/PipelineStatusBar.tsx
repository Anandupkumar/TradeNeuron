import { cn } from '@/lib/utils';
import { useHealth } from '../../hooks/useHealth';
import { useMarketStatus } from '../../hooks/useMarketStatus';

type StatusVariant = 'gray' | 'emerald' | 'amber' | 'red';

interface StatusConfig {
  variant: StatusVariant;
  label: string;
}

const dot_colors: Record<StatusVariant, string> = {
  gray: 'bg-muted-foreground',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
};

const text_colors: Record<StatusVariant, string> = {
  gray: 'text-muted-foreground',
  emerald: 'text-emerald-400',
  amber: 'text-amber-400',
  red: 'text-red-400',
};

function resolveStatus(
  is_weekday: boolean,
  pipeline_ran_today: boolean,
  data_is_stale: boolean,
  active_signals_count: number,
): StatusConfig {
  if (!is_weekday) {
    return { variant: 'gray', label: 'Weekend — markets closed' };
  }

  if (pipeline_ran_today) {
    return {
      variant: 'emerald',
      label: `Data updated today · ${active_signals_count} active signal${active_signals_count === 1 ? '' : 's'}`,
    };
  }

  if (data_is_stale) {
    return {
      variant: 'red',
      label: 'Data may be stale — pipeline has not run today',
    };
  }

  return {
    variant: 'amber',
    label: 'Waiting for pipeline (runs at 4:30 PM IST)',
  };
}

export function PipelineStatusBar() {
  const { data: health } = useHealth();
  const { pipelineRanToday, dataIsStale, isWeekday } = useMarketStatus(
    health?.last_pipeline_run,
  );

  const active_signals_count = health?.active_signals_count ?? 0;
  const { variant, label } = resolveStatus(
    isWeekday,
    pipelineRanToday,
    dataIsStale,
    active_signals_count,
  );

  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5">
      <span
        className={cn('inline-block h-2 w-2 rounded-full', dot_colors[variant])}
      />
      <span className={cn('text-xs font-medium', text_colors[variant])}>
        {label}
      </span>
    </div>
  );
}
