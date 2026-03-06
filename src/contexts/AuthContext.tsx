"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { getSupabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";
import type { PlayerRow } from "@/types/supabase";

interface AuthContextValue {
  user: User | null;
  player: PlayerRow | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  register: (
    email: string,
    password: string,
    displayName: string
  ) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  updateProfile: (
    updates: Partial<Pick<PlayerRow, "display_name" | "avatar_sprite">>
  ) => Promise<void>;
  refreshPlayer: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [player, setPlayer] = useState<PlayerRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const clientRef = useRef(getSupabase());
  const isConfigured = clientRef.current !== null;

  const fetchPlayer = useCallback(async (userId: string) => {
    const sb = clientRef.current;
    if (!sb) return;
    const { data } = await sb
      .from("players")
      .select("*")
      .eq("id", userId)
      .single();
    setPlayer(data as PlayerRow | null);
  }, []);

  const refreshPlayer = useCallback(async () => {
    if (user) await fetchPlayer(user.id);
  }, [user, fetchPlayer]);

  useEffect(() => {
    const sb = clientRef.current;
    if (!sb) {
      setIsLoading(false);
      return;
    }

    sb.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchPlayer(s.user.id);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchPlayer(s.user.id);
      } else {
        setPlayer(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchPlayer]);

  const login = useCallback(
    async (email: string, password: string) => {
      const sb = clientRef.current;
      if (!sb) return { error: "Not configured" };
      const { error } = await sb.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    []
  );

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const sb = clientRef.current;
      if (!sb) return { error: "Not configured" };
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) return { error: error.message };
      if (!data.user) return { error: "Registration failed" };

      const { error: profileError } = await sb.from("players").insert({
        id: data.user.id,
        display_name: displayName,
      });
      if (profileError) return { error: profileError.message };

      return { error: null };
    },
    []
  );

  const logout = useCallback(async () => {
    const sb = clientRef.current;
    if (!sb) return;
    await sb.auth.signOut();
    setPlayer(null);
  }, []);

  const updateProfile = useCallback(
    async (
      updates: Partial<Pick<PlayerRow, "display_name" | "avatar_sprite">>
    ) => {
      const sb = clientRef.current;
      if (!sb || !user) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await sb.from("players").update(updates as any).eq("id", user.id);
      await fetchPlayer(user.id);
    },
    [user, fetchPlayer]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        player,
        session,
        isLoading,
        isConfigured,
        login,
        register,
        logout,
        updateProfile,
        refreshPlayer,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
