import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useIsAuthenticated } from '@/shared/stores/auth';

export function ProtectedRoute() {
  const authed = useIsAuthenticated();
  const location = useLocation();
  if (!authed) {
    // ringSilent keeps the ring transition quiet on this redirect
    return <Navigate to="/login" replace state={{ from: location.pathname, ringSilent: true }} />;
  }
  return <Outlet />;
}
