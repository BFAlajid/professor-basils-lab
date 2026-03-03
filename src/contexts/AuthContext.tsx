"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, setAccessToken, ApiError } from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  mfaEnabled: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async (): Promise<AuthUser | null> => {
    try {
      return await api.get<AuthUser>("/users/me");
    } catch {
      return null;
    }
  }, []);

  // Silent refresh on mount — recovers session from the HttpOnly cookie
  useEffect(() => {
    const silentRefresh = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"}/auth/refresh`,
          { method: "POST", credentials: "include" },
        );

        if (res.ok) {
          const data = (await res.json()) as { accessToken: string };
          setAccessToken(data.accessToken);
          const me = await fetchMe();
          setUser(me);
        }
      } catch {
        // No valid session — user stays logged out
      } finally {
        setIsLoading(false);
      }
    };

    silentRefresh();
  }, [fetchMe]);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const data = await api.post<{ accessToken: string; user: AuthUser }>(
        "/auth/login",
        { email, password },
      );
      setAccessToken(data.accessToken);
      setUser(data.user);
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      // Best-effort — clear local state regardless
      if (!(err instanceof ApiError)) throw err;
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    const me = await fetchMe();
    setUser(me);
  }, [fetchMe]);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
