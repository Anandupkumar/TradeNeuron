import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatINR, formatDate, formatRR, formatDateTime, formatPct } from '../../utils/format';
import { SignalBadge } from './SignalBadge';
import { StatusBadge } from '../common/StatusBadge';
import { ExecutionBadge } from './ExecutionBadge';
import { ConfidenceBreakdownBar } from './ConfidenceBreakdownBar';
import { ConfidenceBar } from '../common/ConfidenceBar';
import { ExplainabilityPanel } from './ExplainabilityPanel';
import { TradeChecklist } from './TradeChecklist';
import { DecisionOverridePanel } from './DecisionOverridePanel';
import { useCalibration } from '../../hooks/useFunnel';
import type { Signal } from '../../types';

interface SignalDetailDrawerProps {
  signal: Signal | null;
  open: boolean;
  on_close: () => void;
}

function priceRow(label: string, value: number, color_class: string) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-medium', color_class)}>{formatINR(value)}</span>
    </div>
  );
}

function detailRow(label: string, value: React.ReactNode) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

function regimeLabel(multiplier: number | null): string {
  if (multiplier == null || multiplier === 1) return '1.0x';
  if (multiplier === 0.5) return '0.5x (Ranging)';
  if (multiplier === 0.7) return '0.7x (High VIX)';
  return `${multiplier}x`;
}

export function SignalDetailDrawer({ signal, open, on_close }: SignalDetailDrawerProps) {
  const { data: calibration } = useCalibration();

  if (!signal) return null;

  const bucket_value = Math.floor(signal.confidence / 5) * 5;
  const matched_bucket = calibration?.buckets?.find(
    (b) => b.confidence_bucket === bucket_value
  );

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
          'fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">{signal.symbol}</h2>
            <p className="text-xs text-muted-foreground">{formatDateTime(signal.created_at)}</p>
          </div>
          <button
            onClick={on_close}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            {SignalBadge({ signal_type: signal.signal_type, direction: signal.direction })}
            {StatusBadge({ status: signal.status })}
            {!signal.is_executable && <ExecutionBadge execution_type={signal.execution_type} />}
          </div>

          <div className="space-y-2">
            <ConfidenceBar value={signal.confidence} tier={signal.confidence_tier} />
            <ConfidenceBreakdownBar
              breakdown={signal.confidence_breakdown}
              confidence={signal.confidence}
            />
          </div>

          <div className="divide-y divide-border/50 rounded-lg border border-border bg-card px-4">
            {priceRow('Entry Price', signal.entry_price, 'text-foreground')}
            {priceRow('Target Price', signal.target_price, 'text-emerald-400')}
            {priceRow('Stop Loss', signal.stop_loss, 'text-red-400')}
          </div>

          <div className="divide-y divide-border/50 rounded-lg border border-border bg-card px-4">
            {detailRow('Risk : Reward', formatRR(signal.risk_reward))}
            {detailRow('Shares', (typeof signal.shares_to_buy === 'string' ? Number.parseInt(signal.shares_to_buy, 10) : signal.shares_to_buy).toLocaleString('en-IN'))}
            {detailRow('Position Value', formatINR(signal.position_value))}
            {detailRow('Capital at Risk', formatINR(signal.capital_risk_inr))}
            {signal.regime_size_multiplier != null && signal.regime_size_multiplier < 1 &&
              detailRow('Position Scale', (
                <span className="text-amber-400">{regimeLabel(signal.regime_size_multiplier)}</span>
              ))
            }
          </div>

          {matched_bucket && (
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs text-muted-foreground">Historical Win Rate at This Confidence</p>
              <p className="mt-1 text-lg font-bold text-foreground">
                {formatPct(Number(matched_bucket.actual_win_rate))}
              </p>
              <p className="text-xs text-muted-foreground">
                Based on {matched_bucket.total_signals} signals in the {matched_bucket.confidence_bucket}–{matched_bucket.confidence_bucket + 4} range
              </p>
            </div>
          )}

          <div className="divide-y divide-border/50 rounded-lg border border-border bg-card px-4">
            {detailRow('Strategy', signal.strategy_source.replaceAll('_', ' '))}
            {detailRow('Direction', signal.direction)}
            {detailRow('Execution', signal.execution_type)}
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
