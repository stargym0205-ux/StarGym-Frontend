import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../App';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/verify`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          // Token is invalid or expired
          localStorage.removeItem('token');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth verification error:', error);
        localStorage.removeItem('token');
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    verifyAuth();

    // Re-verify authentication every 5 minutes
    const interval = setInterval(verifyAuth, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        <span className="inline-flex items-center gap-3 text-xl">
          <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
          Verifying authentication...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page with return URL
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;

