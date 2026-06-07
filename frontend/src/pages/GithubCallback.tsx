import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LogoTransition from "../components/LogoAnimation";
import axiosInstance from "../utils/axiosInstance";

export default function GithubCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { checkAuth } = useAuth();

  const [error, setError] = useState("");
  const [apiCompleted, setApiCompleted] = useState(false);
  const [animationCompleted, setAnimationCompleted] = useState(false);
  const [loadingText, setLoadingText] = useState("Verifying GitHub credentials...");

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code) {
      setError("No authorization code provided from GitHub.");
      return;
    }

    const authenticate = async () => {
      try {
        setLoadingText("Exchanging code for session tokens...");
        const res = await axiosInstance.post("/users/auth/github", { code });

        if (res.data?.success && res.data?.data) {
          const { accessToken, refreshToken } = res.data.data;
          localStorage.setItem("accessToken", accessToken);
          localStorage.setItem("refreshToken", refreshToken);

          setLoadingText("Restoring session context...");
          await checkAuth();
          setApiCompleted(true);
        } else {
          throw new Error("Invalid response payload from server.");
        }
      } catch (err: any) {
        console.error("GitHub Auth exchange failed:", err);
        setError(err.response?.data?.message || err.message || "Failed to authenticate with GitHub.");
      }
    };

    authenticate();
  }, [searchParams, checkAuth]);

  // Navigate only when both API call and animation transition have completed
  useEffect(() => {
    if (apiCompleted && animationCompleted) {
      navigate("/", { replace: true });
    }
  }, [apiCompleted, animationCompleted, navigate]);

  const handleTransitionComplete = () => {
    setAnimationCompleted(true);
  };

  if (error) {
    return (
      <div className="relative flex min-h-screen w-screen items-center justify-center overflow-hidden px-4 py-8 bg-zinc-50 dark:bg-zinc-950">
        <div className="relative w-full max-w-md rounded-[2rem] border border-zinc-200/80 bg-white/90 p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950/85 sm:p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-650 dark:bg-red-950/30 dark:text-red-400 mb-4">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Authentication Failed</h3>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{error}</p>
          <button
            onClick={() => navigate("/login", { replace: true })}
            className="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 transition cursor-pointer"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl">
      <LogoTransition width={550} height={330} onComplete={handleTransitionComplete} />
      <div className="text-center mt-6 flex flex-col items-center gap-2">
        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-wide uppercase">
          {apiCompleted ? "Secured" : "GitHub Connecting"}
        </p>
        <div className="flex items-center gap-2 mt-1.5 justify-center">
          <p className="text-sm font-medium text-zinc-650 dark:text-zinc-450">
            {apiCompleted ? "Preparing your workspace..." : loadingText}
          </p>
        </div>
      </div>
    </div>
  );
}
