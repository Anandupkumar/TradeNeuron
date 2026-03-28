import { useState } from 'react';
import { Filter, AlertTriangle, ArrowDown, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFunnel } from '../hooks/useFunnel';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import type { FunnelGate } from '../types';

const GATE_LABELS: Record<string, string> = {
  DUPLICATE: 'Duplicate Check',
  FUNDAMENTAL_FILTER: 'Fundamental Filter',
  SENTIMENT_FILTER: 'Sentiment Filter',
  VWAP_FILTER: 'VWAP Distance',
  PCR_FILTER: 'Put-Call Ratio',
  CONFIDENCE_GATE: 'Confidence Gate',
  RR_GATE: 'Risk:Reward Gate',
  SECTOR_GATE: 'Sector Cap',
  ACTIVE_CAP: 'Active Signal Cap',
  MERGED_RISK_ZERO: 'Merged Risk Zero',
  POSITION_SIZING: 'Position Sizing',
};

const GATE_COLORS: Record<string, string> = {
  DUPLICATE: 'bg-slate-500',
  FUNDAMENTAL_FILTER: 'bg-teal-500',
  SENTIMENT_FILTER: 'bg-cyan-500',
  VWAP_FILTER: 'bg-amber-500',
  PCR_FILTER: 'bg-purple-500',
  CONFIDENCE_GATE: 'bg-orange-500',
  RR_GATE: 'bg-yellow-500',
  SECTOR_GATE: 'bg-indigo-500',
  ACTIVE_CAP: 'bg-blue-500',
  MERGED_RISK_ZERO: 'bg-red-500',
  POSITION_SIZING: 'bg-pink-500',
};

function PassRateBar({ gate }: { gate: FunnelGate }) {
  const color = GATE_COLORS[gate.gate] ?? 'bg-muted-foreground';
  const is_strict = gate.input >= 5 && gate.pass_rate_pct < 40;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className={cn('h-2.5 w-2.5 rounded-full', color)} />
          <span className="font-medium text-foreground">
            {GATE_LABELS[gate.gate] ?? gate.gate.replaceAll('_', ' ')}
          </span>
          {is_strict && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              Strict
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{gate.input} in</span>
          <TrendingDown className="h-3 w-3 text-red-400" />
          <span className="text-red-400">-{gate.rejected}</span>
          <ArrowDown className="h-3 w-3" />
          <span className="font-medium text-foreground">{gate.passed} out</span>
        </div>
      </div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            gate.pass_rate_pct >= 80 ? 'bg-emerald-500' :
            gate.pass_rate_pct >= 60 ? 'bg-blue-500' :
            gate.pass_rate_pct >= 40 ? 'bg-amber-500' :
            'bg-red-500',
          )}
          style={{ width: `${Math.max(gate.pass_rate_pct, 2)}%` }}
        />
      </div>
      <p className="text-right text-xs text-muted-foreground">
        {gate.pass_rate_pct.toFixed(1)}% pass rate
      </p>
    </div>
  );
}

export default function FunnelPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, set_date] = useState(today);
  const { data, isLoading, isError, refetch } = useFunnel(date);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pipeline Funnel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gate-by-gate breakdown of signal filtering
          </p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => set_date(e.target.value)}
          className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {isLoading && <LoadingSkeleton variant="card" count={3} />}
      {isError && <ErrorState message="Failed to load funnel data" onRetry={() => { refetch(); }} />}

      {!isLoading && !isError && !data && (
        <EmptyState
          icon={<Filter className="h-8 w-8" />}
          title="No funnel data"
          description="No pipeline data available for this date."
        />
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Total Candidates</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{data.total_candidates}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Final Signals</p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">{data.final_signals}</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs text-muted-foreground">Conversion Rate</p>
              <p className={cn(
                'mt-1 text-2xl font-bold',
                data.overall_conversion_pct >= 10 ? 'text-emerald-400' :
                data.overall_conversion_pct >= 5 ? 'text-amber-400' :
                'text-red-400',
              )}>
                {data.overall_conversion_pct.toFixed(1)}%
              </p>
            </div>
          </div>

          {data.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-400">Over-strict gates detected</p>
                  {data.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-muted-foreground">{w}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {data.funnel.length === 0 ? (
            <EmptyState
              icon={<Filter className="h-8 w-8" />}
              title="No rejections"
              description="No signals were rejected on this date — all candidates passed."
            />
          ) : (
            <div className="space-y-5 rounded-lg border border-border bg-card p-5">
              <h2 className="text-base font-semibold text-foreground">Gate Breakdown</h2>
              <div className="space-y-4">
                {data.funnel.map((gate) => (
                  <PassRateBar key={gate.gate} gate={gate} />
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card/50">
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Gate</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Input</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Rejected</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Passed</th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Pass Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.funnel.map((gate) => (
                  <tr key={gate.gate} className="bg-card">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">
                      {GATE_LABELS[gate.gate] ?? gate.gate.replaceAll('_', ' ')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-muted-foreground">{gate.input}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-red-400">-{gate.rejected}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right text-foreground">{gate.passed}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <span className={cn(
                        'font-medium',
                        gate.pass_rate_pct >= 80 ? 'text-emerald-400' :
                        gate.pass_rate_pct >= 60 ? 'text-blue-400' :
                        gate.pass_rate_pct >= 40 ? 'text-amber-400' :
                        'text-red-400',
                      )}>
                        {gate.pass_rate_pct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
