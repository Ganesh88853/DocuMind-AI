/**
 * ProtectedRoute — guards routes that require authentication.
 * Redirects unauthenticated users to /login, preserving the
 * originally requested path so they can be sent back after login.
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@store/authStore';
import { PageLoader } from '@components/ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    // Preserve the attempted URL so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
