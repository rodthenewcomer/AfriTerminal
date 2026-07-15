import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { installAuthAutoRefresh, mobileSupabase } from "../lib/supabase";
import { setNativeBillingUser } from "../services/native-billing";
import { unregisterPushDevice } from "../services/push-registration";
import { useSettingsStore } from "../stores";

interface MobileAuthState {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  signOut: () => Promise<void>;
}

const MobileAuthContext = createContext<MobileAuthState | null>(null);

export function MobileAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(mobileSupabase));

  useEffect(() => {
    if (!mobileSupabase) return;
    let active = true;
    const removeRefresh = installAuthAutoRefresh();
    void mobileSupabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data } = mobileSupabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setLoading(false);
      }
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
      removeRefresh();
    };
  }, []);

  useEffect(() => {
    void setNativeBillingUser(session?.user.id ?? null).catch(() => undefined);
  }, [session?.user.id]);

  const value = useMemo<MobileAuthState>(() => ({
    configured: Boolean(mobileSupabase),
    loading,
    session,
    user: session?.user ?? null,
    signOut: async () => {
      if (session?.access_token && useSettingsStore.getState().serverPushRegistered) {
        await unregisterPushDevice(session.access_token).catch(() => undefined);
      }
      useSettingsStore.getState().setNotifications(false);
      useSettingsStore.getState().setServerPushRegistered(false);
      if (mobileSupabase) await mobileSupabase.auth.signOut();
      await setNativeBillingUser(null).catch(() => undefined);
    },
  }), [loading, session]);
  return <MobileAuthContext.Provider value={value}>{children}</MobileAuthContext.Provider>;
}

export function useMobileAuth(): MobileAuthState {
  const context = useContext(MobileAuthContext);
  if (!context) throw new Error("useMobileAuth must be used inside MobileAuthProvider");
  return context;
}
