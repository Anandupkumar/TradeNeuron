import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

interface EquityCurveChartProps {
  data: { date: string; cumulative_pnl: number }[];
  height?: number;
}

export function EquityCurveChart({ data, height = 300 }: EquityCurveChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="equity-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#a1a1aa', fontSize: 12 }}
          tickLine={{ stroke: '#27272a' }}
          axisLine={{ stroke: '#27272a' }}
        />
        <YAxis
          tick={{ fill: '#a1a1aa', fontSize: 12 }}
          tickLine={{ stroke: '#27272a' }}
          axisLine={{ stroke: '#27272a' }}
          tickFormatter={(v: number | string) => `${Number(v).toFixed(1)}%`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#18181b',
            border: '1px solid #27272a',
            borderRadius: 8,
            color: '#fafafa',
          }}
          labelStyle={{ color: '#a1a1aa' }}
          formatter={(value: number | string) => [`${Number(value).toFixed(2)}%`, 'Cumulative PnL']}
        />
        <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
        <Area
          type="monotone"
          dataKey="cumulative_pnl"
          stroke="#22c55e"
          strokeWidth={2}
          fill="url(#equity-fill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
