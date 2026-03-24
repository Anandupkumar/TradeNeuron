import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Signal } from '../../types';

type CheckStatus = 'pass' | 'warn' | 'fail';

interface CheckItem {
  label: string;
  status: CheckStatus;
  detail: string;
}

function confidenceStatus(val: number): CheckStatus {
  if (val >= 80) return 'pass';
  if (val >= 70) return 'warn';
  return 'fail';
}

function rrStatus(val: number): CheckStatus {
  if (val >= 3) return 'pass';
  if (val >= 2) return 'warn';
  return 'fail';
}

function statusStatus(val: string): CheckStatus {
  if (val === 'ACTIVE' || val === 'TARGET_HIT') return 'pass';
  return 'fail';
}

function volumeStatus(val: number): CheckStatus {
  if (val >= 20) return 'pass';
  if (val > 0) return 'warn';
  return 'fail';
}

function deriveChecklist(signal: Signal): CheckItem[] {
  const conf = typeof signal.confidence === 'string' ? Number.parseFloat(signal.confidence) : signal.confidence;
  const rr = typeof signal.risk_reward === 'string' ? Number.parseFloat(signal.risk_reward) : signal.risk_reward;
  const shares = typeof signal.shares_to_buy === 'string' ? Number.parseInt(signal.shares_to_buy, 10) : signal.shares_to_buy;
  const items: CheckItem[] = [
    { label: 'Confidence', status: confidenceStatus(conf), detail: `${Math.round(conf)}%` },
    { label: 'Risk : Reward', status: rrStatus(rr), detail: `${rr.toFixed(2)}x` },
    { label: 'Direction', status: signal.direction === 'LONG' ? 'pass' : 'warn', detail: signal.direction },
    { label: 'Status', status: statusStatus(signal.status), detail: signal.status.replaceAll('_', ' ') },
    { label: 'Position Size', status: shares > 0 ? 'pass' : 'fail', detail: `${shares} shares` },
  ];

  const breakdown = signal.confidence_breakdown;
  if (breakdown) {
    items.push({ label: 'Volume', status: volumeStatus(breakdown.volume), detail: `+${breakdown.volume} pts` });
  }

  return items;
}

const STATUS_STYLES: Record<CheckStatus, { icon: typeof CheckCircle; color: string }> = {
  pass: { icon: CheckCircle, color: 'text-emerald-500' },
  warn: { icon: AlertCircle, color: 'text-amber-500' },
  fail: { icon: XCircle, color: 'text-red-500' },
};

export function TradeChecklist({ signal }: { signal: Signal }) {
  const items = deriveChecklist(signal);

  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
        Trade Checklist
      </p>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => {
          const style = STATUS_STYLES[item.status];
          const Icon = style.icon;
          return (
            <div
              key={item.label}
              className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2"
            >
              <Icon className={cn('h-4 w-4 shrink-0', style.color)} />
              <div className="min-w-0">
                <p className="truncate text-xs text-zinc-400">{item.label}</p>
                <p className="truncate text-sm font-medium text-zinc-200">{item.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
