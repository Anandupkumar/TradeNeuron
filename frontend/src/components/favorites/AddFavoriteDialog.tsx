import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NIFTY_50_SYMBOLS } from '../../utils/symbols';

interface AddFavoriteDialogProps {
  open: boolean;
  on_close: () => void;
  on_add: (symbol: string, notes?: string) => void;
}

export function AddFavoriteDialog({ open, on_close, on_add }: AddFavoriteDialogProps) {
  const [selected_symbol, set_selected_symbol] = useState('');
  const [notes, set_notes] = useState('');

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected_symbol) return;
    on_add(selected_symbol, notes.trim() || undefined);
    set_selected_symbol('');
    set_notes('');
    on_close();
  }

  function handleCancel() {
    set_selected_symbol('');
    set_notes('');
    on_close();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        tabIndex={-1}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleCancel}
        aria-label="Close dialog"
      />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-100">Add to Watchlist</h2>
          <button
            onClick={handleCancel}
            className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="symbol_select" className="mb-1.5 block text-sm font-medium text-zinc-300">
              Symbol
            </label>
            <select
              id="symbol_select"
              value={selected_symbol}
              onChange={(e) => set_selected_symbol(e.target.value)}
              className={cn(
                'w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200',
                'focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500',
              )}
            >
              <option value="">Select a stock…</option>
              {NIFTY_50_SYMBOLS.map((sym) => (
                <option key={sym} value={sym}>
                  {sym}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="notes_input" className="mb-1.5 block text-sm font-medium text-zinc-300">
              Notes <span className="text-zinc-600">(optional)</span>
            </label>
            <textarea
              id="notes_input"
              value={notes}
              onChange={(e) => set_notes(e.target.value)}
              rows={3}
              placeholder="Why are you watching this stock?"
              className={cn(
                'w-full resize-none rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-200',
                'placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500',
              )}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selected_symbol}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                selected_symbol
                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                  : 'cursor-not-allowed bg-zinc-700 text-zinc-500',
              )}
            >
              Add to Watchlist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
