import { cn } from '@/lib/utils';
import { formatPct, formatRR, toNum } from '../../utils/format';
import type { BacktestResult } from '../../types';

interface BacktestResultCardProps {
  result: BacktestResult;
}

function metricCell(label: string, value: string, color?: string) {
  return (
    <div>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={cn('mt-0.5 text-lg font-semibold', color ?? 'text-zinc-200')}>{value}</p>
    </div>
  );
}

export function BacktestResultCard({ result }: BacktestResultCardProps) {
  const win_rate = toNum(result.win_rate_pct) ?? 0;
  const avg_return = toNum(result.avg_return_pct) ?? 0;
  const win_color = win_rate >= 50 ? 'text-emerald-400' : 'text-red-400';
  const return_color = avg_return >= 0 ? 'text-emerald-400' : 'text-red-400';

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-zinc-100">
            {result.strategy_name.split('_').join(' ')}
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">{result.test_period}</p>
        </div>
        <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
          {result.total_signals} signals
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {metricCell('Win Rate', formatPct(result.win_rate_pct), win_color)}
        {metricCell('Avg Return', formatPct(result.avg_return_pct, true), return_color)}
        {metricCell('Max Drawdown', formatPct(result.max_drawdown_pct, true), 'text-red-400')}
        {metricCell(
          'Sharpe Ratio',
          toNum(result.sharpe_ratio)?.toFixed(2) ?? '—',
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-zinc-800 pt-4">
        {metricCell(
          'Profit Factor',
          result.profit_factor == null ? '—' : formatRR(result.profit_factor),
        )}
        {metricCell(
          'Avg Holding Days',
          (() => { const v = toNum(result.avg_holding_days); return v == null ? '—' : `${v.toFixed(1)}d`; })(),
        )}
      </div>

      <div className="mt-4 flex items-center gap-4 border-t border-zinc-800 pt-4">
        <span className="text-xs text-zinc-500">
          W: <span className="font-medium text-emerald-400">{result.wins}</span>
        </span>
        <span className="text-xs text-zinc-500">
          L: <span className="font-medium text-red-400">{result.losses}</span>
        </span>
        <span className="text-xs text-zinc-500">
          N: <span className="font-medium text-zinc-300">{result.neutral}</span>
        </span>
      </div>
    </div>
  );
}
