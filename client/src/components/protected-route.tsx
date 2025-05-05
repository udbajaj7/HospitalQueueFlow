import { ReactNode, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, roles = [] }) => {
  const { user, isLoading, isAuthenticated, checkRole } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to login with return URL
      setLocation(`/login?returnUrl=${encodeURIComponent(location)}`);
    } else if (!isLoading && isAuthenticated && roles.length > 0 && !checkRole(roles)) {
      // User is authenticated but doesn't have the required role
      if (checkRole(['admin'])) {
        setLocation('/admin');
      } else if (checkRole(['staff'])) {
        setLocation('/staff');
      } else if (checkRole(['kiosk'])) {
        setLocation('/kiosk');
      } else {
        setLocation('/');
      }
    }
  }, [isLoading, isAuthenticated, checkRole, roles, location, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-teal-600" />
          <p className="mt-4 text-lg text-slate-700 dark:text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  if (roles.length > 0 && !checkRole(roles)) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
};

export default ProtectedRoute;
