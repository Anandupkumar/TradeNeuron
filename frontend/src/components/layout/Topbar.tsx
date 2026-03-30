import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PipelineStatusBar } from './PipelineStatusBar';
import { useThemeStore } from '../../store/theme.store';
import { NIFTY_50_SYMBOLS, SECTOR_MAP, type NiftySymbol } from '../../utils/symbols';

export function Topbar() {
  const theme = useThemeStore((s) => s.theme);
  const toggle_theme = useThemeStore((s) => s.toggleTheme);
  const navigate = useNavigate();

  const [open, set_open] = useState(false);
  const [query, set_query] = useState('');
  const [selected_idx, set_selected_idx] = useState(0);
  const input_ref = useRef<HTMLInputElement>(null);
  const panel_ref = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return [...NIFTY_50_SYMBOLS];
    const q = query.toLowerCase();
    return NIFTY_50_SYMBOLS.filter((s) => {
      const clean = s.replace('.NS', '').toLowerCase();
      const sector = (SECTOR_MAP[s] ?? '').toLowerCase();
      return clean.includes(q) || sector.includes(q);
    });
  }, [query]);

  useEffect(() => {
    set_selected_idx(0);
  }, [filtered.length]);

  const go_to_symbol = useCallback(
    (symbol: string) => {
      set_open(false);
      set_query('');
      navigate(`/stock/${encodeURIComponent(symbol)}`);
    },
    [navigate],
  );

  useEffect(() => {
    function handle_key(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        !open &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        set_open(true);
      }
      if (e.key === 'Escape' && open) {
        set_open(false);
        set_query('');
      }
    }
    document.addEventListener('keydown', handle_key);
    return () => document.removeEventListener('keydown', handle_key);
  }, [open]);

  useEffect(() => {
    if (open) input_ref.current?.focus();
  }, [open]);

  useEffect(() => {
    function handle_click(e: MouseEvent) {
      if (panel_ref.current && !panel_ref.current.contains(e.target as Node)) {
        set_open(false);
        set_query('');
      }
    }
    if (open) document.addEventListener('mousedown', handle_click);
    return () => document.removeEventListener('mousedown', handle_click);
  }, [open]);

  const handle_input_key = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      set_selected_idx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      set_selected_idx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && filtered[selected_idx]) {
      go_to_symbol(filtered[selected_idx]);
    }
  };

  return (
    <header
      className={cn(
        'flex items-center justify-between border-b border-border bg-background px-6 py-3',
      )}
    >
      <PipelineStatusBar />

      <div className="flex items-center gap-3">
        <div className="relative" ref={panel_ref}>
          <button
            type="button"
            onClick={() => set_open(true)}
            className={cn(
              'flex items-center gap-2 rounded-md border border-border bg-muted px-3 py-1.5 text-sm text-muted-foreground transition-colors',
              'hover:bg-accent hover:text-foreground',
            )}
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search stock…</span>
            <kbd className="hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
              /
            </kbd>
          </button>

          {open && (
            <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
              <div className="border-b border-border px-3 py-2">
                <input
                  ref={input_ref}
                  type="text"
                  value={query}
                  onChange={(e) => set_query(e.target.value)}
                  onKeyDown={handle_input_key}
                  placeholder="Search by symbol or sector…"
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <ul className="max-h-64 overflow-y-auto py-1">
                {filtered.length === 0 && (
                  <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                    No symbols match
                  </li>
                )}
                {filtered.map((sym, idx) => (
                  <li key={sym}>
                    <button
                      type="button"
                      onClick={() => go_to_symbol(sym)}
                      onMouseEnter={() => set_selected_idx(idx)}
                      className={cn(
                        'flex w-full items-center justify-between px-3 py-2 text-sm transition-colors',
                        idx === selected_idx
                          ? 'bg-accent text-accent-foreground'
                          : 'text-foreground hover:bg-accent/50',
                      )}
                    >
                      <span className="font-medium">{sym.replace('.NS', '')}</span>
                      <span className="text-xs text-muted-foreground">
                        {SECTOR_MAP[sym] ?? ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={toggle_theme}
          className={cn(
            'rounded-lg p-2 text-muted-foreground transition-colors',
            'hover:bg-muted hover:text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring',
          )}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>
      </div>
    </header>
  );
}
