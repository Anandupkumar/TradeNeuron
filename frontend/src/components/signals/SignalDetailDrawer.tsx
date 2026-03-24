import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatINR, formatDate, formatRR, formatDateTime } from '../../utils/format';
import { SignalBadge } from './SignalBadge';
import { StatusBadge } from '../common/StatusBadge';
import { ConfidenceBreakdownBar } from './ConfidenceBreakdownBar';
import { ExplainabilityPanel } from './ExplainabilityPanel';
import { TradeChecklist } from './TradeChecklist';
import { DecisionOverridePanel } from './DecisionOverridePanel';
import type { Signal } from '../../types';

interface SignalDetailDrawerProps {
  signal: Signal | null;
  open: boolean;
  on_close: () => void;
}

function priceRow(label: string, value: number, color_class: string) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className={cn('text-sm font-medium', color_class)}>{formatINR(value)}</span>
    </div>
  );
}

function detailRow(label: string, value: React.ReactNode) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm text-zinc-200">{value}</span>
    </div>
  );
}

export function SignalDetailDrawer({ signal, open, on_close }: SignalDetailDrawerProps) {
  if (!signal) return null;

  return (
    <>
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close drawer"
        className={cn(
          'fixed inset-0 z-40 border-none bg-black/60 transition-opacity',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={on_close}
      />

      <div
        className={cn(
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-50">{signal.symbol}</h2>
            <p className="text-xs text-zinc-500">{formatDateTime(signal.created_at)}</p>
          </div>
          <button
            onClick={on_close}
            className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-zinc-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="flex items-center gap-2">
            {SignalBadge({ signal_type: signal.signal_type, direction: signal.direction })}
            {StatusBadge({ status: signal.status })}
          </div>

          <ConfidenceBreakdownBar
            breakdown={signal.confidence_breakdown}
            confidence={signal.confidence}
          />

          <div className="divide-y divide-zinc-800/50 rounded-lg border border-zinc-800 bg-zinc-900 px-4">
            {priceRow('Entry Price', signal.entry_price, 'text-zinc-100')}
            {priceRow('Target Price', signal.target_price, 'text-emerald-400')}
            {priceRow('Stop Loss', signal.stop_loss, 'text-red-400')}
          </div>

          <div className="divide-y divide-zinc-800/50 rounded-lg border border-zinc-800 bg-zinc-900 px-4">
            {detailRow('Risk : Reward', formatRR(signal.risk_reward))}
            {detailRow('Shares', (typeof signal.shares_to_buy === 'string' ? Number.parseInt(signal.shares_to_buy, 10) : signal.shares_to_buy).toLocaleString('en-IN'))}
            {detailRow('Position Value', formatINR(signal.position_value))}
            {detailRow('Capital at Risk', formatINR(signal.capital_risk_inr))}
          </div>

          <div className="divide-y divide-zinc-800/50 rounded-lg border border-zinc-800 bg-zinc-900 px-4">
            {detailRow('Strategy', signal.strategy_source.replaceAll('_', ' '))}
            {detailRow('Direction', signal.direction)}
            {detailRow('Date', formatDate(signal.date))}
          </div>

          <TradeChecklist signal={signal} />

          <ExplainabilityPanel
            explanation={signal.explanation}
            reasons={signal.reasons}
          />

          <DecisionOverridePanel signalId={signal.id} />
        </div>
      </div>
    </>
  );
}
