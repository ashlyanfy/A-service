"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

import { api } from "./api";
import { useI18n } from "./i18n/context";
import { clearTokens, getAccessToken, setTokens } from "./tokens";
import { User } from "@/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const { setLanguage } = useI18n();
  const router = useRouter();

  const fetchMe = async (): Promise<User | null> => {
    try {
      const response = await api.get<User>("/auth/me");
      return response.data;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    (async () => {
      if (!getAccessToken()) {
        setLoading(false);
        return;
      }
      const me = await fetchMe();
      if (me) {
        setUser(me);
        setLanguage(me.language);
      } else {
        clearTokens();
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    // Полный сброс кэша предыдущей сессии до входа
    queryClient.clear();
    clearTokens();
    setUser(null);

    const response = await api.post("/auth/login", { email, password });
    const { access_token, refresh_token, user: loggedInUser } = response.data;

    setTokens(access_token, refresh_token);
    setUser(loggedInUser);
    setLanguage(loggedInUser.language);

    queryClient.clear();
  };

  const logout = () => {
    api.post("/auth/logout").catch(() => undefined);
    clearTokens();
    setUser(null);
    queryClient.clear();
    router.push("/login");
  };

  const refreshUser = async () => {
    const me = await fetchMe();
    if (me) {
      setUser(me);
      setLanguage(me.language);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
