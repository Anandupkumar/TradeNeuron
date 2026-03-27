import { useState, useEffect } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDecision, useUpsertDecision } from '../../hooks/useTradeDecisions';
import type { DecisionType } from '../../types';

interface Props {
  signalId: number;
}

const DECISION_OPTIONS: { value: DecisionType; label: string; color: string }[] = [
  { value: 'TAKEN', label: 'Taken', color: 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500' },
  { value: 'SKIPPED', label: 'Skipped', color: 'bg-red-600/80 hover:bg-red-500 border-red-500' },
  { value: 'MODIFIED', label: 'Modified', color: 'bg-amber-600/80 hover:bg-amber-500 border-amber-500' },
];

export function DecisionOverridePanel({ signalId }: Props) {
  const { data: existing } = useDecision(signalId);
  const mutation = useUpsertDecision(signalId);

  const [decision, setDecision] = useState<DecisionType | null>(null);
  const [notes, setNotes] = useState('');
  const [actualEntry, setActualEntry] = useState('');
  const [actualQty, setActualQty] = useState('');

  useEffect(() => {
    if (existing) {
      setDecision(existing.decision);
      setNotes(existing.notes ?? '');
      setActualEntry(existing.actual_entry != null ? String(existing.actual_entry) : '');
      setActualQty(existing.actual_qty != null ? String(existing.actual_qty) : '');
    }
  }, [existing]);

  const handleSave = () => {
    if (!decision) return;
    mutation.mutate({
      decision,
      notes: notes || undefined,
      actual_entry: actualEntry ? Number.parseFloat(actualEntry) : undefined,
      actual_qty: actualQty ? Number.parseInt(actualQty, 10) : undefined,
    });
  };

  return (
    <div>
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Your Decision
      </p>

      <div className="flex gap-2">
        {DECISION_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setDecision(opt.value)}
            className={cn(
              'flex-1 rounded-md border px-3 py-2 text-sm font-medium text-white transition-colors',
              decision === opt.value
                ? opt.color
                : 'border-border bg-muted/60 text-muted-foreground hover:border-border',
            )}
          >
            {decision === opt.value && <Check className="mr-1 inline h-3.5 w-3.5" />}
            {opt.label}
          </button>
        ))}
      </div>

      {decision === 'MODIFIED' && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="actual-entry" className="mb-1 block text-xs text-muted-foreground">Actual Entry</label>
            <input
              id="actual-entry"
              type="number"
              step="0.01"
              value={actualEntry}
              onChange={(e) => setActualEntry(e.target.value)}
              className="w-full rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-foreground outline-none focus:border-ring"
            />
          </div>
          <div>
            <label htmlFor="actual-qty" className="mb-1 block text-xs text-muted-foreground">Actual Qty</label>
            <input
              id="actual-qty"
              type="number"
              step="1"
              value={actualQty}
              onChange={(e) => setActualQty(e.target.value)}
              className="w-full rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-foreground outline-none focus:border-ring"
            />
          </div>
        </div>
      )}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Notes (optional)"
        rows={2}
        className="mt-3 w-full rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-ring"
      />

      <button
        type="button"
        onClick={handleSave}
        disabled={!decision || mutation.isPending}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {existing ? 'Update Decision' : 'Save Decision'}
      </button>

      {existing && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Last updated: {new Date(existing.updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
        </p>
      )}
    </div>
  );
}
