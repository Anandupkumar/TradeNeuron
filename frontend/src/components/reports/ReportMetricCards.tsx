import { StatCard } from '../common/StatCard';
import { formatNumber, formatPct } from '../../utils/format';
import type { ReportOverview } from '../../types';

interface ReportMetricCardsProps {
  overview: ReportOverview;
}

export function ReportMetricCards({ overview }: ReportMetricCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard label="Signals" value={formatNumber(overview.total_signals)} sub_text="Generated in range" />
      <StatCard
        label="Paper Trades"
        value={formatNumber(overview.closed_paper_trades)}
        sub_text={`${formatPct(overview.paper_win_rate_pct)} win rate`}
      />
      <StatCard
        label="Paper PnL"
        value={formatPct(overview.paper_total_pnl_pct, true)}
        trend={overview.paper_total_pnl_pct > 0 ? 'up' : overview.paper_total_pnl_pct < 0 ? 'down' : 'neutral'}
      />
      <StatCard
        label="Pipeline Success"
        value={formatPct(overview.pipeline_success_rate_pct)}
        sub_text={`${formatPct(overview.signal_conversion_pct)} signal conversion`}
      />
    </div>
  );
}
