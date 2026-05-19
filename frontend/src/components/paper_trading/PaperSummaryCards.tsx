import { StatCard } from '../common/StatCard';
import { formatPct } from '../../utils/format';
import type { PaperTradingSummary } from '../../types';

interface PaperSummaryCardsProps {
  summary: PaperTradingSummary;
}

export function PaperSummaryCards({ summary }: PaperSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {StatCard({ label: 'Total Trades', value: summary.total_trades })}
      {StatCard({ label: 'Open', value: summary.open_trades })}
      {StatCard({ label: 'Closed', value: summary.closed_trades })}
      {StatCard({
        label: 'Win Rate',
        value: formatPct(summary.win_rate_pct),
        trend: summary.win_rate_pct >= 50 ? 'up' : 'down',
      })}
      {StatCard({
        label: 'Avg PnL%',
        value: formatPct(summary.avg_pnl_pct, true),
        trend: summary.avg_pnl_pct >= 0 ? 'up' : 'down',
      })}
      {StatCard({
        label: 'Total PnL%',
        value: formatPct(summary.total_pnl_pct, true),
        trend: summary.total_pnl_pct >= 0 ? 'up' : 'down',
      })}
      {StatCard({
        label: 'Max Drawdown',
        value: formatPct(summary.max_drawdown_pct, true),
        trend: 'down',
      })}
      {StatCard({ label: 'Partial', value: summary.partial_exited_trades })}
      {StatCard({ label: 'Trailing', value: summary.trailing_trades })}
      {StatCard({ label: 'Stale', value: summary.stale_trades, trend: summary.stale_trades > 0 ? 'down' : 'neutral' })}
      {StatCard({ label: 'Compressing', value: summary.compressing_trades })}
    </div>
  );
}
