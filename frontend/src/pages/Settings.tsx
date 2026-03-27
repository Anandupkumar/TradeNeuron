import {
  Sun,
  Moon,
  Wifi,
  WifiOff,
  Keyboard,
  Info,
  ToggleLeft,
  Check,
  X as XIcon,
} from 'lucide-react';
import { useHealth } from '../hooks/useHealth';
import { useIdentityStore } from '../store/identity.store';
import { useThemeStore } from '../store/theme.store';
import { APP_NAME, APP_VERSION, API_BASE_URL, FEATURES } from '../utils/constants';
import { cn } from '@/lib/utils';

const keyboard_shortcuts: { key: string; description: string }[] = [
  { key: 'D', description: 'Dashboard' },
  { key: 'S', description: 'Signals' },
  { key: 'W', description: 'Watchlist' },
  { key: 'P', description: 'Paper Trading' },
  { key: 'B', description: 'Backtest' },
  { key: ',', description: 'Settings' },
  { key: '/', description: 'Focus search' },
  { key: 'F', description: 'Toggle filters' },
  { key: 'Esc', description: 'Close overlay' },
];

const feature_entries: { label: string; key: keyof typeof FEATURES }[] = [
  { label: 'Short Signals', key: 'shortSignals' },
  { label: 'Paper Trading', key: 'paperTrading' },
  { label: 'Backtest', key: 'backtest' },
];

function sectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function settingsPage() {
  const health_query = useHealth();
  const { userId } = useIdentityStore();
  const { theme, toggleTheme } = useThemeStore();

  const is_connected = health_query.data?.status === 'ok';
  const truncated_user_id = userId.length > 12 ? `${userId.slice(0, 12)}…` : userId;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      {sectionCard({
        title: 'Connection',
        icon: <Wifi className="h-5 w-5" />,
        children: (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">API Base URL</span>
              <code className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {API_BASE_URL}
              </code>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              {health_query.isLoading && (
                <span className="text-xs text-muted-foreground">Checking…</span>
              )}
              {!health_query.isLoading && is_connected && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                  <Wifi className="h-3.5 w-3.5" />
                  Connected
                </span>
              )}
              {!health_query.isLoading && !is_connected && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400">
                  <WifiOff className="h-3.5 w-3.5" />
                  Disconnected
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">User ID</span>
              <code
                className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                title={userId}
              >
                {truncated_user_id}
              </code>
            </div>
          </div>
        ),
      })}

      {sectionCard({
        title: 'Preferences',
        icon: theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />,
        children: (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Theme</p>
              <p className="text-xs text-muted-foreground">
                {theme === 'dark' ? 'Dark mode' : 'Light mode'}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
          </div>
        ),
      })}

      {sectionCard({
        title: 'Feature Flags',
        icon: <ToggleLeft className="h-5 w-5" />,
        children: (
          <div className="space-y-3">
            {feature_entries.map((entry) => {
              const is_enabled = FEATURES[entry.key];
              return (
                <div key={entry.key} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{entry.label}</span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                      is_enabled
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-muted/50 text-muted-foreground',
                    )}
                  >
                    {is_enabled ? (
                      <>
                        <Check className="h-3 w-3" /> Enabled
                      </>
                    ) : (
                      <>
                        <XIcon className="h-3 w-3" /> Disabled
                      </>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        ),
      })}

      {sectionCard({
        title: 'Keyboard Shortcuts',
        icon: <Keyboard className="h-5 w-5" />,
        children: (
          <div className="divide-y divide-border">
            {keyboard_shortcuts.map((shortcut) => (
              <div
                key={shortcut.key}
                className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
              >
                <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                <kbd className="rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        ),
      })}

      {sectionCard({
        title: 'About',
        icon: <Info className="h-5 w-5" />,
        children: (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Application</span>
              <span className="text-sm font-medium text-foreground">{APP_NAME}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Version</span>
              <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                v{APP_VERSION}
              </span>
            </div>
          </div>
        ),
      })}
    </div>
  );
}
