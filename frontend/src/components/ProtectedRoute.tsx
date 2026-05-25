import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoadingProgress from "./LoadingProgress";

export default function ProtectedRoute({ children }: { children: React.JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <LoadingProgress progress={70} label="Authenticating session..." />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  return children;
}
