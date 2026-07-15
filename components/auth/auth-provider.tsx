"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { hasSupabasePublicEnv } from "@/lib/supabase/env";
import { trackProductEvent } from "@/lib/analytics";

interface AuthState {
  configured: boolean;
  loading: boolean;
  user: User | null;
  session: Session | null;
  client: SupabaseClient | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = hasSupabasePublicEnv();
  const [client] = useState<SupabaseClient | null>(() =>
    configured ? createBrowserSupabaseClient() : null
  );
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);

  useEffect(() => {
    if (!client) return;
    let active = true;
    void client.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data } = client.auth.onAuthStateChange((event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setLoading(false);
        if (event === "SIGNED_IN") trackProductEvent("auth_complete", { provider: nextSession?.user.app_metadata.provider ?? "unknown" });
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [client]);

  const value = useMemo<AuthState>(() => ({
    configured,
    loading,
    user: session?.user ?? null,
    session,
    client,
    signOut: async () => {
      if (client) await client.auth.signOut();
    },
  }), [client, configured, loading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
