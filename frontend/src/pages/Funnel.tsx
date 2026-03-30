import { useState } from 'react';
import { Filter, AlertTriangle, ArrowDown, TrendingDown, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFunnel, useRejectionDistribution } from '../hooks/useFunnel';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import { EmptyState } from '../components/common/EmptyState';
import { formatPct } from '../utils/format';
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
  FREQUENCY_CAP: 'Frequency Cap',
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
  FREQUENCY_CAP: 'bg-emerald-500',
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

const PERIOD_OPTIONS = [7, 14, 30, 60, 90];

export default function FunnelPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, set_date] = useState(today);
  const [period_days, set_period_days] = useState(30);
  const { data, isLoading, isError, refetch } = useFunnel(date);
  const { data: distribution, isLoading: dist_loading } = useRejectionDistribution(period_days);

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

      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Rejection Distribution
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Aggregate rejection stats over a period</p>
          </div>
          <div className="flex items-center gap-2">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => set_period_days(p)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  period_days === p
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                {p}d
              </button>
            ))}
          </div>
        </div>

        {dist_loading && <LoadingSkeleton variant="card" count={2} />}

        {distribution && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Total Rejected</p>
                <p className="mt-1 text-2xl font-bold text-red-400">{distribution.total_rejected}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Period</p>
                <p className="mt-1 text-2xl font-bold text-foreground">{distribution.period_days}d</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Avg Confidence at Rejection</p>
                <p className="mt-1 text-2xl font-bold text-amber-400">
                  {distribution.avg_raw_confidence_at_rejection != null
                    ? distribution.avg_raw_confidence_at_rejection.toFixed(1)
                    : '—'}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Avg R:R at Rejection</p>
                <p className="mt-1 text-2xl font-bold text-blue-400">
                  {distribution.avg_raw_rr_at_rejection != null
                    ? `${distribution.avg_raw_rr_at_rejection.toFixed(2)}x`
                    : '—'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-3 rounded-lg border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-foreground">By Stage</h3>
                {distribution.by_stage.map((s) => {
                  const max_pct = Math.max(...distribution.by_stage.map((x) => x.pct));
                  return (
                    <div key={s.reject_stage} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          {GATE_LABELS[s.reject_stage] ?? s.reject_stage.replaceAll('_', ' ')}
                        </span>
                        <span className="text-foreground">{s.count} ({formatPct(s.pct)})</span>
                      </div>
                      <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-red-500/70"
                          style={{ width: `${max_pct > 0 ? (s.pct / max_pct) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-lg border border-border bg-card p-5">
                <h3 className="mb-3 text-sm font-semibold text-foreground">Top Rejected Symbols</h3>
                {distribution.by_symbol.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No data</p>
                ) : (
                  <div className="space-y-2">
                    {distribution.by_symbol.slice(0, 10).map((s, i) => (
                      <div key={s.symbol} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          <span className="mr-2 text-xs text-muted-foreground/50">{i + 1}.</span>
                          {s.symbol.replace('.NS', '')}
                        </span>
                        <span className="font-medium text-foreground">{s.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
