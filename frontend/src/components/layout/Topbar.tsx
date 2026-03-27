import { Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PipelineStatusBar } from './PipelineStatusBar';
import { useThemeStore } from '../../store/theme.store';

export function Topbar() {
  const theme = useThemeStore((s) => s.theme);
  const toggle_theme = useThemeStore((s) => s.toggleTheme);

  return (
    <header
      className={cn(
        'flex items-center justify-between border-b border-border bg-background px-6 py-3',
      )}
    >
      <PipelineStatusBar />

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
    </header>
  );
}
