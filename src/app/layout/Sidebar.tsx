import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  UserCog,
  ScrollText,
  Cable,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useUiStore } from '@/shared/stores/ui';
import { useIntroStore } from '@/shared/stores/intro';
import { useHasPermission } from '@/shared/stores/auth';
import { useT, type TranslationKey } from '@/shared/lib/i18n';
import { RingCanvas } from '@/shared/ui/RingCanvas';
import { Tooltip } from '@/shared/ui';

export const navItems: Array<{ to: string; icon: typeof Gem; label: TranslationKey; perm?: string }> = [
  { to: '/', icon: LayoutDashboard, label: 'nav.dashboard' },
  { to: '/inbox', icon: MessageCircle, label: 'nav.inbox' },
  { to: '/orders', icon: Gem, label: 'nav.orders' },
  { to: '/products', icon: Package, label: 'nav.products' },
  { to: '/clients', icon: Users, label: 'nav.clients' },
  { to: '/payments', icon: CreditCard, label: 'nav.payments' },
  { to: '/reports', icon: BarChart3, label: 'nav.reports' },
  { to: '/knowledge', icon: BookOpen, label: 'nav.knowledge' },
  { to: '/settings/staff', icon: UserCog, label: 'nav.staff' },
  { to: '/settings/audit', icon: ScrollText, label: 'nav.audit' },
  { to: '/settings/integrations', icon: Cable, label: 'nav.integrations', perm: 'settings:manage_integrations' },
  { to: '/settings', icon: Settings, label: 'nav.settings' },
];

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const introPlaying = useIntroStore((s) => s.stage === 'playing');
  const canIntegrations = useHasPermission('settings:manage_integrations');
  const t = useT();
  const items = navItems.filter((it) => !it.perm || (it.perm === 'settings:manage_integrations' && canIntegrations));

  return (
    <aside
      className={`glass hidden h-full shrink-0 flex-col overflow-hidden rounded-[var(--r-lg)] transition-[width] duration-200 ease-out md:flex ${
        collapsed ? 'w-16' : 'w-[248px]'
      }`}
    >
      {/* brand: ring mark always; wordmark collapses away */}
      <div className={`flex items-center py-5 ${collapsed ? 'justify-center px-2' : 'gap-1.5 px-4'}`}>
        <span
          data-intro-logo-slot
          className={`-my-1 block h-10 w-10 shrink-0 ${introPlaying ? 'opacity-0' : ''}`}
        >
          <RingCanvas size={40} rotationMs={7000} />
        </span>
        {!collapsed && <span className="brand-gradient text-lg font-bold tracking-tight">Almaz Silver</span>}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2.5 py-2" aria-label="Asosiy">
        {items.map(({ to, icon: Icon, label }) => {
          const link = (
            <NavLink
              key={to}
              to={to}
              end={to === '/' || to === '/settings'}
              aria-label={t(label)}
              className={({ isActive }) =>
                `group relative flex h-10 items-center rounded-[var(--r-sm)] text-sm font-medium transition-colors duration-150 ${
                  collapsed ? 'justify-center' : 'gap-3 px-3'
                } ${
                  isActive
                    ? 'bg-accent-soft text-accent-ink'
                    : 'text-muted hover:bg-surface-2 hover:text-text'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* 3px accent indicator — shared layout transition between items */}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-bar"
                      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent"
                      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    />
                  )}
                  <Icon
                    className="h-[20px] w-[20px] shrink-0"
                    strokeWidth={isActive ? 2.1 : 1.75}
                  />
                  <span className={collapsed ? 'sr-only' : 'truncate'}>{t(label)}</span>
                </>
              )}
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
        aria-pressed={collapsed}
        className="m-2.5 flex h-10 items-center justify-center rounded-[var(--r-sm)] border border-border text-muted transition-colors hover:bg-surface-2 hover:text-text"
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
          {({ isActive }) => (
            <>
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.1 : 1.5} />
              {t(label)}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
