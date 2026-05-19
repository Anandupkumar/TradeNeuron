import { useState } from 'react';
import type { ReactNode } from 'react';
import { BarChart3, Download, Printer } from 'lucide-react';
import { DataTable } from '../components/common/DataTable';
import { EmptyState } from '../components/common/EmptyState';
import { ErrorState } from '../components/common/ErrorState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { ReportMetricCards } from '../components/reports/ReportMetricCards';
import { useReportFilters } from '../hooks/useFilterUrlSync';
import { downloadPerformanceReportCsv, usePerformanceReport } from '../hooks/usePerformanceReport';
import { friendlyError } from '../utils/constants';
import { formatDate, formatDateTime, formatDurationMs, formatINR, formatNumber, formatPct, formatRR } from '../utils/format';
import { logger } from '../utils/logger';
import type { PipelineRunSummary, ReportBucket, RejectionStageReport, StrategyPerformanceRow } from '../types';

function SectionCard({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function EmptySection({ title }: Readonly<{ title: string }>) {
  return (
    <EmptyState
      icon={<BarChart3 className="h-8 w-8" />}
      title={title}
      description="No records were found for the selected report range."
    />
  );
}

function bucketColumns(label: string) {
  return [
    { key: 'key', header: label, render: (row: ReportBucket) => String(row.key) },
    { key: 'total', header: 'Total', render: (row: ReportBucket) => formatNumber(row.total), sortable: true },
    { key: 'wins', header: 'Wins', render: (row: ReportBucket) => formatNumber(row.wins), sortable: true },
    { key: 'win_rate_pct', header: 'Win Rate', render: (row: ReportBucket) => formatPct(row.win_rate_pct), sortable: true },
  ];
}

export default function ReportPage() {
  const [filters, set_filters] = useReportFilters();
  const [isExporting, setIsExporting] = useState(false);
  const report_query = usePerformanceReport(filters);
  const report = report_query.data;

  const handle_csv_download = async () => {
    setIsExporting(true);
    try {
      const csv_blob = await downloadPerformanceReportCsv(filters);
      const url = globalThis.URL.createObjectURL(csv_blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tradeneuron-performance-${filters.from_date}-to-${filters.to_date}.csv`;
      link.click();
      globalThis.URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('[Report] CSV export failed', error);
    } finally {
      setIsExporting(false);
    }
  };

  if (report_query.isError) {
    return (
      <div className="p-6">
        <ErrorState
          message={friendlyError(report_query.error.message)}
          onRetry={() => report_query.refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 print:bg-white print:text-black">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">System Performance Report</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One report for pipeline health, signal quality, paper trading, strategies, and backtests.
          </p>
          {report && (
            <p className="mt-2 text-xs text-muted-foreground">
              Generated {formatDateTime(report.generated_at_ist)}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-end gap-3 print:hidden">
          <label className="space-y-1 text-xs text-muted-foreground">
            <span>From</span>
            <input
              type="date"
              value={filters.from_date}
              onChange={(event) => set_filters({ from_date: event.target.value })}
              className="block rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            <span>To</span>
            <input
              type="date"
              value={filters.to_date}
              onChange={(event) => set_filters({ to_date: event.target.value })}
              className="block rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </label>
          <button
            type="button"
            onClick={handle_csv_download}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Downloading...' : 'Download CSV'}
          </button>
          <button
            type="button"
            onClick={() => globalThis.print()}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Printer className="h-4 w-4" />
            Print / Save PDF
          </button>
        </div>
      </div>

      {report_query.isLoading && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <LoadingSkeleton variant="card" count={4} />
          </div>
          <LoadingSkeleton variant="table-row" count={8} />
        </>
      )}

      {!report_query.isLoading && !report && (
        <EmptySection title="No report data" />
      )}

      {report && (
        <>
          <ReportMetricCards overview={report.overview} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SectionCard title="Pipeline Health">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Runs</p>
                  <p className="font-semibold text-foreground">{formatNumber(report.pipeline.total_runs)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg Duration</p>
                  <p className="font-semibold text-foreground">{formatDurationMs(report.pipeline.avg_duration_ms)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Completed</p>
                  <p className="font-semibold text-foreground">{formatNumber(report.pipeline.completed_runs)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Failed</p>
                  <p className="font-semibold text-foreground">{formatNumber(report.pipeline.failed_runs)}</p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Signal Factory">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Candidates</p>
                  <p className="font-semibold text-foreground">{formatNumber(report.signal_funnel.total_candidates)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Final Signals</p>
                  <p className="font-semibold text-foreground">{formatNumber(report.signal_funnel.final_signals)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg Confidence</p>
                  <p className="font-semibold text-foreground">{formatNumber(report.signals.avg_confidence)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg R/R</p>
                  <p className="font-semibold text-foreground">{formatRR(report.signals.avg_risk_reward)}</p>
                </div>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Paper Trading Performance">
            <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
              <div>
                <p className="text-muted-foreground">Closed Trades</p>
                <p className="font-semibold text-foreground">{formatNumber(report.paper_trading.closed_trades)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg PnL</p>
                <p className="font-semibold text-foreground">{formatPct(report.paper_trading.avg_pnl_pct, true)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Gross PnL</p>
                <p className="font-semibold text-foreground">{formatINR(report.paper_trading.total_gross_pnl_inr)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Max Drawdown</p>
                <p className="font-semibold text-foreground">{formatPct(report.paper_trading.max_drawdown_pct)}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Opportunity Cost Telemetry">
            <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-5">
              <div>
                <p className="text-muted-foreground">Blocked Signals</p>
                <p className="font-semibold text-foreground">{formatNumber(report.opportunity_cost.total_blocked)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Blocked EV Score</p>
                <p className="font-semibold text-foreground">{formatNumber(report.opportunity_cost.opportunity_cost_score)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Stale Suppression</p>
                <p className="font-semibold text-amber-400">
                  {formatPct(report.opportunity_cost.stale_capital_suppression_rate_pct)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg Confidence</p>
                <p className="font-semibold text-foreground">{formatNumber(report.opportunity_cost.avg_blocked_confidence)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Avg R/R</p>
                <p className="font-semibold text-foreground">{formatRR(report.opportunity_cost.avg_blocked_rr)}</p>
              </div>
            </div>
          </SectionCard>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SectionCard title="Probability Calibration">
              <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Samples</p>
                  <p className="font-semibold text-foreground">{formatNumber(report.calibration_quality.sample_count)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">ECE</p>
                  <p className="font-semibold text-foreground">{formatNumber(report.calibration_quality.expected_calibration_error)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Brier Score</p>
                  <p className="font-semibold text-foreground">{formatNumber(report.calibration_quality.brier_score)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Reachability Warnings</p>
                  <p className="font-semibold text-amber-400">
                    {formatNumber(report.signal_flags.target_reachability_warnings)}
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Regime And Portfolio Risk">
              <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Bullish Prob.</p>
                  <p className="font-semibold text-foreground">
                    {formatPct(report.regime_probability.bullish_probability * 100)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Bearish Prob.</p>
                  <p className="font-semibold text-foreground">
                    {formatPct(report.regime_probability.bearish_probability * 100)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Active Risk</p>
                  <p className="font-semibold text-foreground">{formatPct(report.portfolio_risk.active_risk_pct)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Concentration</p>
                  <p className="font-semibold text-foreground">{formatNumber(report.portfolio_risk.risk_concentration_score)}</p>
                </div>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Signal Outcome Details">
            <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-6">
              <div>
                <p className="text-muted-foreground">Generated</p>
                <p className="font-semibold text-foreground">{formatNumber(report.signals.total_signals)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Active</p>
                <p className="font-semibold text-foreground">{formatNumber(report.signals.active_signals)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Target Hit</p>
                <p className="font-semibold text-emerald-500">{formatNumber(report.signals.target_hits)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Stop Loss Hit</p>
                <p className="font-semibold text-red-500">{formatNumber(report.signals.sl_hits)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Expired</p>
                <p className="font-semibold text-amber-500">{formatNumber(report.signals.expired_signals)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Target Hit Rate</p>
                <p className="font-semibold text-foreground">{formatPct(report.signals.target_hit_rate_pct)}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Resolved signals: {formatNumber(report.signals.resolved_signals)}. Target-hit rate uses resolved signals only.
            </p>
          </SectionCard>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SectionCard title="Outcome Win Rate by Strategy">
              {report.signal_outcomes.by_strategy.length > 0 ? (
                <DataTable
                  columns={bucketColumns('Strategy')}
                  data={report.signal_outcomes.by_strategy}
                  getRowKey={(row) => String(row.key)}
                />
              ) : (
                <EmptySection title="No signal outcomes" />
              )}
            </SectionCard>

            <SectionCard title="Top Rejection Stages">
              {report.signal_funnel.by_stage.length > 0 ? (
                <DataTable
                  columns={[
                    { key: 'reject_stage', header: 'Stage', render: (row: RejectionStageReport) => row.reject_stage },
                    { key: 'count', header: 'Rejected', render: (row: RejectionStageReport) => formatNumber(row.count), sortable: true },
                    { key: 'pct', header: 'Share', render: (row: RejectionStageReport) => formatPct(row.pct), sortable: true },
                  ]}
                  data={report.signal_funnel.by_stage}
                  getRowKey={(row) => row.reject_stage}
                />
              ) : (
                <EmptySection title="No rejected signals" />
              )}
            </SectionCard>
          </div>

          <SectionCard title="Strategy Performance">
            {report.strategy_performance.current.length > 0 ? (
              <DataTable
                columns={[
                  { key: 'strategy_name', header: 'Strategy', render: (row: StrategyPerformanceRow) => row.strategy_name, sortable: true },
                  { key: 'scope_type', header: 'Scope', render: (row: StrategyPerformanceRow) => `${row.scope_type}: ${row.scope_value}` },
                  { key: 'trade_count', header: 'Trades', render: (row: StrategyPerformanceRow) => formatNumber(row.trade_count), sortable: true },
                  { key: 'win_rate_pct', header: 'Win Rate', render: (row: StrategyPerformanceRow) => formatPct(row.win_rate_pct), sortable: true },
                  { key: 'expectancy_pct', header: 'Expectancy', render: (row: StrategyPerformanceRow) => formatPct(row.expectancy_pct, true), sortable: true },
                  { key: 'recommendation', header: 'Recommendation', render: (row: StrategyPerformanceRow) => row.recommendation },
                ]}
                data={report.strategy_performance.current}
                getRowKey={(row) => `${row.strategy_name}-${row.scope_type}-${row.scope_value}`}
              />
            ) : (
              <EmptySection title="No strategy performance" />
            )}
          </SectionCard>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SectionCard title="Recent Pipeline Runs">
              {report.pipeline.recent_runs.length > 0 ? (
                <DataTable
                  columns={[
                    { key: 'run_date', header: 'Run Date', render: (row: PipelineRunSummary) => formatDate(row.run_date), sortable: true },
                    { key: 'status', header: 'Status', render: (row: PipelineRunSummary) => row.status },
                    { key: 'duration_ms', header: 'Duration', render: (row: PipelineRunSummary) => formatDurationMs(row.duration_ms), sortable: true },
                    { key: 'signals_generated', header: 'Signals', render: (row: PipelineRunSummary) => formatNumber(row.signals_generated), sortable: true },
                  ]}
                  data={report.pipeline.recent_runs}
                  getRowKey={(row) => row.id}
                />
              ) : (
                <EmptySection title="No pipeline runs" />
              )}
            </SectionCard>

            <SectionCard title="Backtest Summary">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Runs</p>
                  <p className="font-semibold text-foreground">{formatNumber(report.backtest_summary.total_runs)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Signals Tested</p>
                  <p className="font-semibold text-foreground">{formatNumber(report.backtest_summary.total_signals)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg Win Rate</p>
                  <p className="font-semibold text-foreground">{formatPct(report.backtest_summary.avg_win_rate_pct)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg Profit Factor</p>
                  <p className="font-semibold text-foreground">{formatRR(report.backtest_summary.avg_profit_factor)}</p>
                </div>
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
