import { Link, useLocation, useNavigation } from 'react-router-dom';
import { motion, LayoutGroup, useReducedMotion } from 'framer-motion';
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
  Instagram,
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
  { to: '/social', icon: Instagram, label: 'nav.social' },
  { to: '/clients', icon: Users, label: 'nav.clients' },
  { to: '/payments', icon: CreditCard, label: 'nav.payments' },
  { to: '/reports', icon: BarChart3, label: 'nav.reports' },
  { to: '/knowledge', icon: BookOpen, label: 'nav.knowledge' },
  { to: '/settings/staff', icon: UserCog, label: 'nav.staff' },
  { to: '/settings/audit', icon: ScrollText, label: 'nav.audit' },
  { to: '/settings/integrations', icon: Cable, label: 'nav.integrations', perm: 'settings:manage_integrations' },
  { to: '/settings', icon: Settings, label: 'nav.settings' },
];

/**
 * Active path from the PENDING navigation while one is in flight, else the
 * committed location. This decouples the nav highlight from the ring page
 * transition: the pill starts travelling the instant a navigation begins
 * (link click, navigate(), back/forward, deep link) rather than waiting for
 * the chunk to load / the route to commit.
 */
function useActivePath(): string {
  const location = useLocation();
  const navigation = useNavigation();
  return navigation.location?.pathname ?? location.pathname;
}
/** Matches react-router's NavLink semantics: `end` = exact, else prefix. */
function pathIsActive(activePath: string, to: string, end: boolean): boolean {
  if (end) return activePath === to;
  return activePath === to || activePath.startsWith(to.endsWith('/') ? to : `${to}/`);
}

export function Sidebar() {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const introPlaying = useIntroStore((s) => s.stage === 'playing');
  const canIntegrations = useHasPermission('settings:manage_integrations');
  const t = useT();
  const reduce = useReducedMotion();
  const activePath = useActivePath();
  // Reduced motion → instant snap; otherwise a gentle spring (~260ms, no overshoot).
  const spring = reduce ? { duration: 0 } : ({ type: 'spring', stiffness: 380, damping: 32 } as const);
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

      {/* One LayoutGroup so the pill + edge indicator travel between items */}
      <LayoutGroup id="sidebar-nav">
        <nav className="flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden px-2.5 py-2" aria-label="Asosiy">
          {items.map(({ to, icon: Icon, label }) => {
            const active = pathIsActive(activePath, to, to === '/' || to === '/settings');
            const link = (
              <Link
                key={to}
                to={to}
                aria-label={t(label)}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex h-10 items-center rounded-[var(--r-sm)] text-sm transition-colors duration-150 ${
                  collapsed ? 'justify-center' : 'gap-3 px-3'
                } ${
                  active
                    ? 'font-semibold text-accent-ink'
                    : 'font-medium text-muted hover:bg-surface-2 hover:text-text'
                }`}
              >
                {active && (
                  <>
                    {/* travelling pill background (initial={false} = no first-mount flicker) */}
                    <motion.span
                      layoutId="nav-pill"
                      initial={false}
                      transition={spring}
                      className="absolute inset-0 rounded-[var(--r-sm)] bg-accent-soft"
                    />
                    {/* travelling 3px edge indicator */}
                    <motion.span
                      layoutId="nav-indicator"
                      initial={false}
                      transition={spring}
                      className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-accent"
                    />
                  </>
                )}
                <Icon
                  className={`relative h-[19px] w-[19px] shrink-0 transition-colors duration-150 ${active ? 'text-accent' : ''}`}
                  strokeWidth={active ? 2.1 : 1.75}
                />
                <span className={`relative transition-colors duration-150 ${collapsed ? 'sr-only' : 'truncate'}`}>
                  {t(label)}
                </span>
              </Link>
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
      </LayoutGroup>

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
  const reduce = useReducedMotion();
  const activePath = useActivePath();
  const spring = reduce ? { duration: 0 } : ({ type: 'spring', stiffness: 380, damping: 32 } as const);
  return (
    // Own LayoutGroup — the pill/indicator layoutIds are scoped, so they travel
    // across the bottom-nav items without colliding with the sidebar's.
    <LayoutGroup id="mobile-nav">
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-surface md:hidden"
        aria-label="Asosiy"
      >
        {navItems.slice(0, 5).map(({ to, icon: Icon, label }) => {
          const active = pathIsActive(activePath, to, to === '/');
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-1 flex-col items-center gap-1 py-2 text-2xs ${
                active ? 'font-semibold text-accent-ink' : 'font-medium text-muted'
              }`}
            >
              {active && (
                <>
                  <motion.span
                    layoutId="nav-pill"
                    initial={false}
                    transition={spring}
                    className="absolute inset-x-2 inset-y-1 rounded-[var(--r-sm)] bg-accent-soft"
                  />
                  <motion.span
                    layoutId="nav-indicator"
                    initial={false}
                    transition={spring}
                    className="absolute left-1/2 top-0 h-[3px] w-6 -translate-x-1/2 rounded-b-full bg-accent"
                  />
                </>
              )}
              <Icon
                className={`relative h-[18px] w-[18px] transition-colors duration-150 ${active ? 'text-accent' : ''}`}
                strokeWidth={active ? 2.1 : 1.5}
              />
              <span className="relative">{t(label)}</span>
            </Link>
          );
        })}
      </nav>
    </LayoutGroup>
  );
}
