import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import axiosInstance from "../utils/axiosInstance";
import posthog, { isPostHogEnabled } from "../posthog";

export type TravelPreference = "online_only" | "same_city" | "anywhere_reimbursed" | "anywhere";

export type UserPreferences = {
  homeCity?: string;
  travelPreference?: TravelPreference;
  maxTravelBudgetINR?: number;
  minPrizeINR?: number;
  minDaysToPrepare?: number;
  preferredModes?: string[];
  preferredPlatforms?: string[];
  preferredTeamSize?: number;
  skills?: string[];
};

export type User = {
  _id: string;
  username: string;
  email: string;
  fullName: string;
  preferences?: UserPreferences;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isBackendWarming: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: User, shouldIdentify?: boolean) => void;
  checkAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBackendWarming, setIsBackendWarming] = useState(false);
  const identifiedUserId = useRef<string | null>(null);

  const identifyUser = (identifiedUser: User) => {
    if (!isPostHogEnabled || !identifiedUser._id || identifiedUserId.current === identifiedUser._id) {
      return;
    }

    if (identifiedUserId.current && identifiedUserId.current !== identifiedUser._id) {
      posthog.reset();
    }

    posthog.identify(identifiedUser._id, {
      email: identifiedUser.email,
      name: identifiedUser.fullName,
      username: identifiedUser.username,
    });
    identifiedUserId.current = identifiedUser._id;
  };

  useEffect(() => {
    let isMounted = true;
    
    const warmBackend = async () => {
      // Start a 600ms timer to check if backend is warm.
      // If the ping takes longer than 600ms, set isBackendWarming to true.
      const timer = setTimeout(() => {
        if (isMounted) {
          setIsBackendWarming(true);
        }
      }, 600);

      try {
        await axiosInstance.get("/ping", { timeout: 30000 });
      } catch (err) {
        console.error("Backend warm-up ping failed:", err);
      } finally {
        clearTimeout(timer);
        if (isMounted) {
          setIsBackendWarming(false);
        }
      }
    };

    warmBackend();

    return () => {
      isMounted = false;
    };
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await axiosInstance.get("/users/me");
      if (res.data?.success && res.data?.data) {
        identifyUser(res.data.data);
        setUser(res.data.data);
      } else if (res.data) {
        identifyUser(res.data);
        setUser(res.data);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await axiosInstance.post("/users/login", { email, password });
    const { accessToken, refreshToken, user: loggedUser } = res.data.data;

    localStorage.setItem("accessToken", accessToken);
    localStorage.setItem("refreshToken", refreshToken);

    identifyUser(loggedUser);
    setUser(loggedUser);
    return loggedUser;
  };

  const logout = async () => {
    try {
      await axiosInstance.post("/users/logout");
    } catch (err) {
      console.error("Logout API failed:", err);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      if (isPostHogEnabled) {
        posthog.reset();
      }
      identifiedUserId.current = null;
      setUser(null);
    }
  };

  const updateUser = (updatedUser: User, shouldIdentify = false) => {
    if (shouldIdentify) {
      identifyUser(updatedUser);
    }
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isBackendWarming,
        login,
        logout,
        updateUser,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
