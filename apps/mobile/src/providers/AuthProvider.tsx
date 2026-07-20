import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import type { Session, User } from "@supabase/supabase-js";
import { installAuthAutoRefresh, mobileSupabase } from "../lib/supabase";
import { setNativeBillingUser } from "../services/native-billing";
import { unregisterPushDevice } from "../services/push-registration";
import {
  clearMobileCloudPersonalState,
  subscribeMobileCloudChanges,
  syncMobileData,
} from "../services/cloud-sync";
import { useSettingsStore } from "../stores";

interface MobileAuthState {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  syncStatus: "idle" | "syncing" | "synced" | "error";
  lastSyncedAt: string | null;
  syncError: string | null;
  syncNow: () => Promise<void>;
  signOut: () => Promise<void>;
}

const MobileAuthContext = createContext<MobileAuthState | null>(null);

export function MobileAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(mobileSupabase));
  const [syncStatus, setSyncStatus] = useState<MobileAuthState["syncStatus"]>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const runningSync = useRef(false);
  const queuedSync = useRef(false);
  const scheduleSync = useRef<() => void>(() => undefined);
  const previousCloudUserId = useRef<string | null>(null);
  const syncUserId = session?.user.id;

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

  useEffect(() => {
    const nextUserId = session?.user.id ?? null;
    if (previousCloudUserId.current !== nextUserId) {
      clearMobileCloudPersonalState();
      previousCloudUserId.current = nextUserId;
    }
  }, [session?.user.id]);

  const syncNow = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !syncUserId) return;
    if (runningSync.current) {
      queuedSync.current = true;
      return;
    }
    runningSync.current = true;
    queuedSync.current = false;
    setSyncStatus("syncing");
    setSyncError(null);
    try {
      await syncMobileData(token, syncUserId);
      setSyncStatus("synced");
      setLastSyncedAt(new Date().toISOString());
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Synchronisation impossible";
      setSyncStatus("error");
      setSyncError(message);
      throw caught;
    } finally {
      runningSync.current = false;
      if (queuedSync.current) {
        queuedSync.current = false;
        scheduleSync.current();
      }
    }
  }, [session?.access_token, syncUserId]);

  useEffect(() => {
    if (!session?.access_token) {
      setSyncStatus("idle");
      setLastSyncedAt(null);
      setSyncError(null);
      scheduleSync.current = () => undefined;
      return;
    }
    let active = true;
    let readyForChanges = false;
    let lastRun = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = (delay = 1_500) => {
      if (!active || !readyForChanges) return;
      if (timer) clearTimeout(timer);
      const throttleDelay = Math.max(0, 5_000 - (Date.now() - lastRun));
      timer = setTimeout(() => {
        timer = null;
        void syncNow().then(() => { lastRun = Date.now(); }).catch(() => undefined);
      }, Math.max(delay, throttleDelay));
    };
    scheduleSync.current = schedule;
    const unsubscribe = subscribeMobileCloudChanges(() => {
      if (runningSync.current) queuedSync.current = true;
      else schedule();
    });
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") schedule(0);
    });
    void syncNow().then(() => { lastRun = Date.now(); }).catch(() => undefined).finally(() => {
      readyForChanges = true;
      if (queuedSync.current) schedule();
    });
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      unsubscribe();
      appState.remove();
      scheduleSync.current = () => undefined;
    };
  }, [session?.access_token, syncNow]);

  const value = useMemo<MobileAuthState>(() => ({
    configured: Boolean(mobileSupabase),
    loading,
    session,
    user: session?.user ?? null,
    syncStatus,
    lastSyncedAt,
    syncError,
    syncNow,
    signOut: async () => {
      if (session?.access_token && useSettingsStore.getState().serverPushRegistered) {
        await unregisterPushDevice(session.access_token).catch(() => undefined);
      }
      useSettingsStore.getState().setNotifications(false);
      useSettingsStore.getState().setServerPushRegistered(false);
      clearMobileCloudPersonalState();
      if (mobileSupabase) await mobileSupabase.auth.signOut();
      await setNativeBillingUser(null).catch(() => undefined);
    },
  }), [lastSyncedAt, loading, session, syncError, syncNow, syncStatus]);
  return <MobileAuthContext.Provider value={value}>{children}</MobileAuthContext.Provider>;
}

export function useMobileAuth(): MobileAuthState {
  const context = useContext(MobileAuthContext);
  if (!context) throw new Error("useMobileAuth must be used inside MobileAuthProvider");
  return context;
}
