import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageCircle,
  Gem,
  Package,
  Users,
  CreditCard,
  BarChart3,
  BookOpen,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useUiStore } from '@/shared/stores/ui';
import { useT, type TranslationKey } from '@/shared/lib/i18n';
import { RingMark } from '@/shared/ui/RingMark';
import { Tooltip } from '@/shared/ui';

export const navItems: Array<{ to: string; icon: typeof Gem; label: TranslationKey }> = [
  { to: '/', icon: LayoutDashboard, label: 'nav.dashboard' },
  { to: '/inbox', icon: MessageCircle, label: 'nav.inbox' },
  { to: '/orders', icon: Gem, label: 'nav.orders' },
  { to: '/products', icon: Package, label: 'nav.products' },
  { to: '/clients', icon: Users, label: 'nav.clients' },
  { to: '/payments', icon: CreditCard, label: 'nav.payments' },
  { to: '/reports', icon: BarChart3, label: 'nav.reports' },
  { to: '/knowledge', icon: BookOpen, label: 'nav.knowledge' },
  { to: '/settings', icon: Settings, label: 'nav.settings' },
];

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const t = useT();

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-300 md:flex ${
        collapsed ? 'w-[72px]' : 'w-[250px]'
      }`}
    >
      <div className={`flex items-center gap-3 px-5 py-6 ${collapsed ? 'justify-center px-2' : ''}`}>
        <RingMark size={34} />
        {!collapsed && (
          <span className="brand-gradient text-xl font-bold tracking-tight">Almaz</span>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Asosiy">
        {navItems.map(({ to, icon: Icon, label }) => {
          const link = (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              aria-label={t(label)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                  isActive
                    ? 'bg-accent-soft text-accent-ink'
                    : 'text-muted hover:bg-accent-soft hover:text-text'
                } ${collapsed ? 'justify-center' : ''}`
              }
            >
              <Icon className="h-5 w-5 shrink-0" strokeWidth={1.5} />
              {!collapsed && <span className="truncate">{t(label)}</span>}
            </NavLink>
          );
          return collapsed ? (
            <Tooltip key={to} content={t(label)} side="right">
              {link}
            </Tooltip>
          ) : (
            link
          );
        })}
      </nav>

      <button
        onClick={toggle}
        aria-label={collapsed ? 'Yon panelni ochish' : 'Yon panelni yopish'}
        className="m-3 flex items-center justify-center rounded-lg border border-border py-2 text-muted transition-colors hover:text-accent-ink"
      >
        {collapsed ? (
          <ChevronsRight className="h-4 w-4" strokeWidth={1.5} />
        ) : (
          <ChevronsLeft className="h-4 w-4" strokeWidth={1.5} />
        )}
      </button>
    </aside>
  );
}

/** Bottom navigation on mobile (first 5 items). */
export function MobileNav() {
  const t = useT();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface md:hidden"
      aria-label="Asosiy"
    >
      {navItems.slice(0, 5).map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2.5 text-2xs font-medium ${
              isActive ? 'text-accent-ink' : 'text-muted'
            }`
          }
        >
          <Icon className="h-5 w-5" strokeWidth={1.5} />
          {t(label)}
        </NavLink>
      ))}
    </nav>
  );
}
