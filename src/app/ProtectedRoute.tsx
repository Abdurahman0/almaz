import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useIsAuthenticated } from '@/shared/stores/auth';

export function ProtectedRoute() {
  const authed = useIsAuthenticated();
  const location = useLocation();
  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
