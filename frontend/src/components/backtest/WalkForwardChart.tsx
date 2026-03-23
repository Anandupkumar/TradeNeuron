import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import type { BacktestResult } from '../../types';

interface WalkForwardChartProps {
  results: BacktestResult[];
}

const STRATEGY_COLORS: Record<string, string> = {
  TREND_PULLBACK: '#34d399',
  BREAKOUT: '#60a5fa',
  RANGE: '#c084fc',
  MEAN_REVERSION: '#fbbf24',
  TREND_PULLBACK_SHORT: '#f472b6',
  BREAKDOWN: '#fb923c',
};

const FALLBACK_COLORS = ['#a78bfa', '#22d3ee', '#e879f9', '#4ade80', '#f97316'];

export function WalkForwardChart({ results }: WalkForwardChartProps) {
  const { chart_data, strategy_names, color_map } = useMemo(() => {
    const strategies = [...new Set(results.map((r) => r.strategy_name))];

    const colors: Record<string, string> = {};
    let fallback_idx = 0;
    for (const name of strategies) {
      colors[name] =
        STRATEGY_COLORS[name] ?? FALLBACK_COLORS[fallback_idx++ % FALLBACK_COLORS.length] ?? '#a78bfa';
    }

    const period_map = new Map<string, Record<string, number>>();
    for (const r of results) {
      const existing = period_map.get(r.test_period) ?? {};
      existing[r.strategy_name] = r.win_rate_pct;
      period_map.set(r.test_period, existing);
    }

    const data = Array.from(period_map.entries()).map(([period, values]) => ({
      test_period: period,
      ...values,
    }));

    return { chart_data: data, strategy_names: strategies, color_map: colors };
  }, [results]);

  if (chart_data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900">
        <p className="text-sm text-zinc-500">No backtest data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-4 text-sm font-medium text-zinc-300">Walk-Forward Win Rate by Strategy</h3>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chart_data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="test_period"
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            stroke="#3f3f46"
          />
          <YAxis
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            stroke="#3f3f46"
            domain={[0, 100]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: '0.5rem',
              fontSize: '0.75rem',
            }}
            formatter={(value: number) => [`${value.toFixed(1)}%`, '']}
            labelStyle={{ color: '#a1a1aa' }}
          />
          <Legend
            wrapperStyle={{ fontSize: '0.75rem', color: '#a1a1aa' }}
          />
          {strategy_names.map((name) => (
            <Bar
              key={name}
              dataKey={name}
              name={name.split('_').join(' ')}
              fill={color_map[name]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
