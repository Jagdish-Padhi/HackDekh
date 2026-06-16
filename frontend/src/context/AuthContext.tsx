import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import axiosInstance from "../utils/axiosInstance";

export type User = {
  _id: string;
  username: string;
  email: string;
  fullName: string;
  savedHackathons: string[];
  applications: Array<{
    _id: string;
    hackathon: string | any;
    status: string;
    notes: string;
    appliedAt: string;
  }>;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (updatedUser: User) => void;
  checkAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        setUser(res.data.data);
      } else if (res.data) {
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
      setUser(null);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
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
