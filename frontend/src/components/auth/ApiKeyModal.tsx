import { useState, useEffect, useCallback } from 'react';
import { Activity, Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIdentityStore } from '../../store/identity.store';
import { healthApi } from '../../api/health.api';
import { API_BASE_URL } from '../../utils/constants';

export function ApiKeyModal() {
  const [visible, set_visible] = useState(false);
  const [key_input, set_key_input] = useState('');
  const [error_msg, set_error_msg] = useState('');
  const [loading, set_loading] = useState(false);
  const [show_key, set_show_key] = useState(false);

  const set_api_key = useIdentityStore((s) => s.setApiKey);
  const clear_api_key = useIdentityStore((s) => s.clearApiKey);

  const handleAuthFailure = useCallback(() => {
    set_visible(true);
    set_key_input('');
    set_error_msg('');
  }, []);

  useEffect(() => {
    globalThis.addEventListener('tn:auth-failure', handleAuthFailure);
    return () => globalThis.removeEventListener('tn:auth-failure', handleAuthFailure);
  }, [handleAuthFailure]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = key_input.trim();
    if (!trimmed) return;

    set_loading(true);
    set_error_msg('');
    set_api_key(trimmed);

    try {
      await healthApi.check();
      set_visible(false);
    } catch (err) {
      clear_api_key();
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('401') || message.toLowerCase().includes('unauthorized')) {
        set_error_msg('Invalid key — please check your .env');
      } else {
        set_error_msg(`Could not reach the server at ${API_BASE_URL}`);
      }
    } finally {
      set_loading(false);
    }
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-sm">
      <div className="w-full max-w-md px-4">
        <div className="mb-6 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
            <ShieldAlert className="h-6 w-6 text-red-500" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-foreground">
            Session expired
          </h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Your API key is no longer valid. Enter a new key to continue.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border bg-card p-6 shadow-xl"
        >
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium text-muted-foreground">
              TradeNeuron API Key
            </span>
          </div>

          <div className="relative">
            <input
              type={show_key ? 'text' : 'password'}
              value={key_input}
              onChange={(e) => set_key_input(e.target.value)}
              placeholder="tn_live_..."
              autoComplete="off"
              autoFocus
              className={cn(
                'w-full rounded-lg border bg-background px-4 py-2.5 pr-10 text-sm text-foreground',
                'placeholder:text-muted-foreground focus:outline-none focus:ring-2',
                'focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-background',
                error_msg
                  ? 'border-red-500/50'
                  : 'border-border hover:border-border',
              )}
            />
            <button
              type="button"
              onClick={() => set_show_key((prev) => !prev)}
              className={cn(
                'absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground',
                'hover:text-foreground focus:outline-none',
              )}
              tabIndex={-1}
            >
              {show_key ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>

          {error_msg && (
            <p className="mt-2 text-sm text-red-400">{error_msg}</p>
          )}

          <button
            type="submit"
            disabled={loading || !key_input.trim()}
            className={cn(
              'mt-5 flex w-full items-center justify-center gap-2 rounded-lg py-2.5',
              'text-sm font-medium text-white transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-emerald-500',
              'focus:ring-offset-2 focus:ring-offset-background',
              loading || !key_input.trim()
                ? 'cursor-not-allowed bg-emerald-600/50'
                : 'bg-emerald-600 hover:bg-emerald-500',
            )}
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Validating…' : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  );
}
