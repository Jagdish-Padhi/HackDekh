import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }: { children: React.JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    // Teams or new actions go straight to signup, others to login
    const targetAuth = location.pathname.startsWith('/teams') ? '/signup' : '/login';
    return <Navigate to={`${targetAuth}?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  return children;
}
