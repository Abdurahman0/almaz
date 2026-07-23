import type { ComponentType } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { RingTransitionLayout } from './RingTransition';

// route.lazy (instead of React.lazy + Suspense) keeps the router in a
// "loading" navigation state while a page chunk downloads, so the ring
// overlay stays up until the new page is ready to render.
function page(load: () => Promise<{ default: ComponentType }>) {
  return async () => ({ Component: (await load()).default });
}

export const router = createBrowserRouter([
  {
    // Ring transition for every navigation below; guard REPLACE redirects stay silent.
    element: <RingTransitionLayout minMs={1600} />,
    children: [
      { path: '/login', lazy: page(() => import('@/features/auth/pages/LoginPage')) },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
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
                path: '/products',
                lazy: page(() => import('@/features/products/pages/ProductsPage')),
              },
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
