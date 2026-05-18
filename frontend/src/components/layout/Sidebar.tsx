import { NavLink } from 'react-router-dom';
import {
  Activity,
  LayoutDashboard,
  Zap,
  Filter,
  Star,
  Wallet,
  FlaskConical,
  FileBarChart,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { featureFlags } from '../../utils/featureFlags';
import { useUiStore } from '../../store/ui.store';
import { APP_NAME } from '../../utils/constants';

interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

const base_nav_items: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/signals', label: 'Signals', icon: Zap },
  { path: '/funnel', label: 'Funnel', icon: Filter },
  { path: '/watchlist', label: 'Watchlist', icon: Star },
];

const trailing_nav_items: NavItem[] = [
  { path: '/settings', label: 'Settings', icon: Settings },
];

function buildNavItems(): NavItem[] {
  return [
    ...base_nav_items,
    ...(featureFlags.canAccessPaperTrading()
      ? [{ path: '/paper-trading', label: 'Paper Trading', icon: Wallet }]
      : []),
    ...(featureFlags.canAccessBacktest()
      ? [{ path: '/backtest', label: 'Backtest', icon: FlaskConical }]
      : []),
    ...(featureFlags.canAccessReports()
      ? [{ path: '/reports', label: 'Reports', icon: FileBarChart }]
      : []),
    ...trailing_nav_items,
  ];
}

export function Sidebar() {
  const nav_items = buildNavItems();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-border bg-card transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-16 lg:w-56',
      )}
    >
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600">
          <Activity className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="hidden text-sm font-bold tracking-tight text-foreground lg:block">
            {APP_NAME}
          </span>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-2 py-3">
        {nav_items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                'hover:bg-muted',
                isActive
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="hidden lg:block">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="hidden border-t border-border px-2 py-2 lg:block">
        <button
          type="button"
          onClick={toggle}
          className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <ChevronsLeft className="h-4 w-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
