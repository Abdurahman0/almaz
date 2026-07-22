import { lazy, Suspense } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { ProtectedRoute } from './ProtectedRoute';
import { Skeleton } from '@/shared/ui';

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage'));
const InboxPage = lazy(() => import('@/features/inbox/pages/InboxPage'));
const OrdersPage = lazy(() => import('@/features/orders/pages/OrdersPage'));
const OrderDetailPage = lazy(() => import('@/features/orders/pages/OrderDetailPage'));
const NewOrderPage = lazy(() => import('@/features/orders/pages/NewOrderPage'));
const ProductsPage = lazy(() => import('@/features/products/pages/ProductsPage'));
const ClientsPage = lazy(() => import('@/features/clients/pages/ClientsPage'));
const PaymentsPage = lazy(() => import('@/features/payments/pages/PaymentsPage'));
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage'));
const KnowledgePage = lazy(() => import('@/features/ai/pages/KnowledgePage'));
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage'));
const UiDemoPage = lazy(() => import('@/features/dev/UiDemoPage'));

function Lazy({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 p-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Lazy>
        <LoginPage />
      </Lazy>
    ),
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <Lazy><DashboardPage /></Lazy> },
          { path: '/inbox', element: <Lazy><InboxPage /></Lazy> },
          { path: '/inbox/:conversationId', element: <Lazy><InboxPage /></Lazy> },
          { path: '/orders', element: <Lazy><OrdersPage /></Lazy> },
          { path: '/orders/new', element: <Lazy><NewOrderPage /></Lazy> },
          { path: '/orders/:orderId', element: <Lazy><OrderDetailPage /></Lazy> },
          { path: '/products', element: <Lazy><ProductsPage /></Lazy> },
          { path: '/clients', element: <Lazy><ClientsPage /></Lazy> },
          { path: '/payments', element: <Lazy><PaymentsPage /></Lazy> },
          { path: '/reports', element: <Lazy><ReportsPage /></Lazy> },
          { path: '/knowledge', element: <Lazy><KnowledgePage /></Lazy> },
          { path: '/settings', element: <Lazy><SettingsPage /></Lazy> },
          // Dev-only visual QA for the UI kit
          ...(import.meta.env.DEV
            ? [{ path: '/dev/ui', element: <Lazy><UiDemoPage /></Lazy> }]
            : []),
        ],
      },
    ],
  },
]);
