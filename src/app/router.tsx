import { lazy, Suspense, type ComponentType, type ReactElement } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';

// The CRM shell (app chrome + framer-motion ring transition + auth guard) is
// lazy-loaded so it stays OUT of the entry chunk. Public customer routes
// (/checkout, /map) then download none of it — a phone on mobile data gets only
// the entry vendor bundle + that page's own chunk. These chunks warm on /login,
// so authenticated navigation sees no practical delay.
const AppLayout = lazy(() => import('./layout/AppLayout').then((m) => ({ default: m.AppLayout })));
const ProtectedRoute = lazy(() =>
  import('./ProtectedRoute').then((m) => ({ default: m.ProtectedRoute })),
);
const RingTransitionLayout = lazy(() =>
  import('./RingTransition').then((m) => ({ default: m.RingTransitionLayout })),
);

/** Wrap a lazily-loaded layout element; fallback null (the ring/shell appear as
 *  soon as their chunk resolves — sub-second, and cached after /login). */
const shell = (el: ReactElement) => <Suspense fallback={null}>{el}</Suspense>;

// route.lazy (instead of React.lazy + Suspense) keeps the router in a
// "loading" navigation state while a page chunk downloads, so the ring
// overlay stays up until the new page is ready to render.
//
// A new deploy replaces the hashed chunk files; a tab opened against the OLD
// deploy still references the old names, so a lazy import 404s with "Failed to
// fetch dynamically imported module". We retry once (transient blip), then do a
// one-time full reload to pick up the fresh index.html + chunk map. A
// sessionStorage flag prevents a reload loop if the failure is genuine; it is
// cleared the moment any chunk loads successfully, so a later deploy can reload
// again.
const RELOAD_FLAG = 'almaz-chunk-reload';

async function loadPage(
  load: () => Promise<{ default: ComponentType }>,
): Promise<{ Component: ComponentType }> {
  try {
    const mod = await load();
    sessionStorage.removeItem(RELOAD_FLAG);
    return { Component: mod.default };
  } catch {
    try {
      await new Promise((r) => setTimeout(r, 350));
      const mod = await load();
      sessionStorage.removeItem(RELOAD_FLAG);
      return { Component: mod.default };
    } catch (err) {
      if (!sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, '1');
        window.location.reload();
        // hang until the reload happens so the router doesn't flash its error UI
        return new Promise<{ Component: ComponentType }>(() => {});
      }
      throw err;
    }
  }
}

function page(load: () => Promise<{ default: ComponentType }>) {
  return () => loadPage(load);
}

export const router = createBrowserRouter([
  // Public customer checkout — no auth, no app shell, no ring transition.
  { path: '/checkout/:token', lazy: page(() => import('@/features/checkout/pages/CheckoutPage')) },
  // Public customer location page — same isolation: no auth, no shell, no ring,
  // no background video. Its own lazy chunk so a phone on mobile data downloads
  // nothing from the CRM app.
  { path: '/map/:token', lazy: page(() => import('@/features/map/pages/MapPage')) },
  {
    // Ring transition for every navigation below; guard REPLACE redirects stay silent.
    element: shell(<RingTransitionLayout minMs={1500} />),
    children: [
      { path: '/login', lazy: page(() => import('@/features/auth/pages/LoginPage')) },
      {
        element: shell(<ProtectedRoute />),
        children: [
          {
            element: shell(<AppLayout />),
            children: [
              { path: '/', lazy: page(() => import('@/features/dashboard/pages/DashboardPage')) },
              { path: '/inbox', lazy: page(() => import('@/features/inbox/pages/InboxPage')) },
              {
                path: '/inbox/:conversationId',
                lazy: page(() => import('@/features/inbox/pages/InboxPage')),
              },
              { path: '/orders', lazy: page(() => import('@/features/orders/pages/OrdersPage')) },
              {
                path: '/orders/new',
                lazy: page(() => import('@/features/orders/pages/NewOrderPage')),
              },
              {
                path: '/orders/:orderId',
                lazy: page(() => import('@/features/orders/pages/OrderDetailPage')),
              },
              {
                path: '/orders/:orderId/edit',
                lazy: page(() => import('@/features/orders/pages/OrderEditPage')),
              },
              {
                path: '/products',
                lazy: page(() => import('@/features/products/pages/ProductsPage')),
              },
              {
                path: '/combos',
                lazy: page(() => import('@/features/products/pages/CombosPage')),
              },
              { path: '/social', lazy: page(() => import('@/features/social/pages/SocialPage')) },
              { path: '/social/content/:contentId', lazy: page(() => import('@/features/social/pages/SocialPage')) },
              { path: '/clients', lazy: page(() => import('@/features/clients/pages/ClientsPage')) },
              {
                path: '/payments',
                lazy: page(() => import('@/features/payments/pages/PaymentsPage')),
              },
              { path: '/reports', lazy: page(() => import('@/features/reports/pages/ReportsPage')) },
              { path: '/knowledge', lazy: page(() => import('@/features/ai/pages/KnowledgePage')) },
              {
                path: '/settings',
                lazy: page(() => import('@/features/settings/pages/SettingsPage')),
              },
              {
                path: '/settings/ai-prompts',
                lazy: page(() => import('@/features/ai-prompts/pages/AiPromptsPage')),
              },
              {
                path: '/settings/staff',
                lazy: page(() => import('@/features/settings/pages/StaffPage')),
              },
              {
                path: '/settings/audit',
                lazy: page(() => import('@/features/settings/pages/AuditLogPage')),
              },
              // Integrations page is hidden for now — no one may view it or its
              // data. The page module is no longer imported (its chunk isn't
              // built and its endpoints are never called); direct URLs redirect
              // to Settings. To restore: re-enable the route below + the Sidebar
              // nav item in src/app/layout/Sidebar.tsx.
              // {
              //   path: '/settings/integrations',
              //   lazy: page(() => import('@/features/integrations/pages/IntegrationsPage')),
              // },
              { path: '/settings/integrations', element: <Navigate to="/settings" replace /> },
              // Dev-only visual QA for the UI kit
              ...(import.meta.env.DEV
                ? [{ path: '/dev/ui', lazy: page(() => import('@/features/dev/UiDemoPage')) }]
                : []),
            ],
          },
        ],
      },
    ],
  },
]);
