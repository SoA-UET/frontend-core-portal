import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function ProtectedRoute() {
   const { isAuthenticated, isLoading } = useAuth();
   const location = useLocation();

   if (isLoading) {
      return (
         <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
         </div>
      );
   }

   if (!isAuthenticated) {
      return <Navigate to="/login" state={{ from: location }} replace />;
   }

   return <Outlet />;
}

export default ProtectedRoute;
