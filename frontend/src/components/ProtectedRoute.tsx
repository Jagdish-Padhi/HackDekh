import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LogoTransition from "./LogoAnimation";

export default function ProtectedRoute({ children }: { children: React.JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white dark:bg-zinc-950 transition-colors duration-300">
        <LogoTransition width={550} height={330} autoPlay={true} />
        <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400 tracking-widest uppercase animate-pulse mt-4">
          Authenticating session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  return children;
}
