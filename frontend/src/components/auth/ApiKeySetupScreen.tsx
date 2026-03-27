import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Eye, EyeOff, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIdentityStore } from '../../store/identity.store';
import { healthApi } from '../../api/health.api';
import { API_BASE_URL } from '../../utils/constants';

export function ApiKeySetupScreen() {
  const [key_input, set_key_input] = useState('');
  const [error_msg, set_error_msg] = useState('');
  const [loading, set_loading] = useState(false);
  const [show_key, set_show_key] = useState(false);

  const set_api_key = useIdentityStore((s) => s.setApiKey);
  const clear_api_key = useIdentityStore((s) => s.clearApiKey);
  const navigate = useNavigate();

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = key_input.trim();
    if (!trimmed) return;

    set_loading(true);
    set_error_msg('');
    set_api_key(trimmed);

    try {
      await healthApi.check();
      navigate('/', { replace: true });
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600">
            <Activity className="h-7 w-7 text-white" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-foreground">TradeNeuron</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Enter your TradeNeuron API key to access the dashboard
          </p>
        </div>

        <form
          onSubmit={handleConnect}
          className={cn(
            'rounded-xl border border-border bg-card p-6 shadow-xl',
          )}
        >
          <label
            htmlFor="api-key-input"
            className="mb-2 block text-sm font-medium text-muted-foreground"
          >
            API Key
          </label>
          <div className="relative">
            <input
              id="api-key-input"
              type={show_key ? 'text' : 'password'}
              value={key_input}
              onChange={(e) => set_key_input(e.target.value)}
              placeholder="tn_live_..."
              autoComplete="off"
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
            {loading ? 'Connecting…' : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  );
}
