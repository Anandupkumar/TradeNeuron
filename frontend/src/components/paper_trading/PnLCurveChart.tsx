import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { formatPct, formatDate, toNum } from '../../utils/format';
import type { PaperTrade } from '../../types';

interface PnLCurveChartProps {
  trades: PaperTrade[];
}

export function PnLCurveChart({ trades }: PnLCurveChartProps) {
  const equity_data = useMemo(() => {
    const closed = trades
      .filter(
        (t): t is PaperTrade & { exit_date: string } =>
          t.status === 'CLOSED' && t.exit_date != null,
      )
      .sort((a, b) => new Date(a.exit_date).getTime() - new Date(b.exit_date).getTime());

    let running_pnl = 0;
    return closed.map((t) => {
      running_pnl += toNum(t.pnl_pct) ?? 0;
      return {
        date: t.exit_date,
        cumulative_pnl: Number.parseFloat(running_pnl.toFixed(2)),
        symbol: t.symbol,
      };
    });
  }, [trades]);

  if (equity_data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-card">
        <p className="text-sm text-muted-foreground">No closed trades to display</p>
      </div>
    );
  }

  const max_pnl = Math.max(...equity_data.map((d) => d.cumulative_pnl));
  const min_pnl = Math.min(...equity_data.map((d) => d.cumulative_pnl));
  const last_point = equity_data.at(-1);
  const is_positive = last_point ? last_point.cumulative_pnl >= 0 : true;

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-medium text-muted-foreground">Equity Curve (Cumulative PnL%)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={equity_data}>
          <defs>
            <linearGradient id="pnl_gradient" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={is_positive ? '#34d399' : '#f87171'}
                stopOpacity={0.3}
              />
              <stop
                offset="100%"
                stopColor={is_positive ? '#34d399' : '#f87171'}
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="date"
            tickFormatter={(v: string) => formatDate(v)}
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            stroke="#3f3f46"
          />
          <YAxis
            tickFormatter={(v: number | string) => `${Number(v).toFixed(1)}%`}
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            stroke="#3f3f46"
            domain={[Math.floor(min_pnl - 1), Math.ceil(max_pnl + 1)]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
            }}
            labelFormatter={(v: string) => formatDate(v)}
            formatter={(value: number) => [formatPct(value, true), 'PnL']}
          />
          <Area
            type="monotone"
            dataKey="cumulative_pnl"
            stroke={is_positive ? '#34d399' : '#f87171'}
            strokeWidth={2}
            fill="url(#pnl_gradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
