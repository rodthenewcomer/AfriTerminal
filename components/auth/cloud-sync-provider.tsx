"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/components/auth/auth-provider";
import {
  clearWebCloudPersonalState,
  subscribeWebCloudChanges,
  syncWebData,
} from "@/lib/web-cloud-sync";

export type CloudSyncStatus = "idle" | "syncing" | "synced" | "offline" | "error";

interface CloudSyncState {
  status: CloudSyncStatus;
  lastSyncedAt: string | null;
  error: string | null;
  syncNow: () => Promise<void>;
}

const CloudSyncContext = createContext<CloudSyncState | null>(null);
const CHANGE_DEBOUNCE_MS = 1_200;
const MIN_SYNC_INTERVAL_MS = 4_000;

export function CloudSyncProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const token = session?.access_token ?? null;
  const userId = session?.user.id ?? null;
  const [status, setStatus] = useState<CloudSyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runRef = useRef<() => Promise<void>>(async () => undefined);

  useEffect(() => {
    if (!token || !userId) {
      clearWebCloudPersonalState();
      setStatus("idle");
      setLastSyncedAt(null);
      setError(null);
      runRef.current = async () => undefined;
      return;
    }

    let active = true;
    let running = false;
    let queued = false;
    let readyForChanges = false;
    let lastRun = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = (delay = CHANGE_DEBOUNCE_MS) => {
      if (!readyForChanges || !active) return;
      if (timer) clearTimeout(timer);
      const throttleDelay = Math.max(0, MIN_SYNC_INTERVAL_MS - (Date.now() - lastRun));
      timer = setTimeout(() => {
        timer = null;
        void perform().catch(() => undefined);
      }, Math.max(delay, throttleDelay));
    };

    const perform = async () => {
      if (running) {
        queued = true;
        return;
      }
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        if (active) setStatus("offline");
        throw new Error("Connexion indisponible. Gardez cette page ouverte : la synchronisation reprendra au retour du réseau.");
      }
      running = true;
      queued = false;
      if (active) {
        setStatus("syncing");
        setError(null);
      }
      try {
        await syncWebData(token, userId);
        lastRun = Date.now();
        if (active) {
          setStatus("synced");
          setLastSyncedAt(new Date().toISOString());
        }
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Synchronisation impossible";
        if (active) {
          setStatus(typeof navigator !== "undefined" && !navigator.onLine ? "offline" : "error");
          setError(message);
        }
        throw caught;
      } finally {
        running = false;
        if (queued) schedule();
      }
    };

    runRef.current = perform;
    const unsubscribe = subscribeWebCloudChanges(() => {
      if (running) queued = true;
      else schedule();
    });
    const onOnline = () => schedule(0);
    const onVisibility = () => {
      if (document.visibilityState === "visible") schedule(0);
    };
    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVisibility);
    void perform().catch(() => undefined).finally(() => {
      readyForChanges = true;
      if (queued) schedule();
    });

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      unsubscribe();
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVisibility);
      runRef.current = async () => undefined;
    };
  }, [token, userId]);

  const syncNow = useCallback(() => runRef.current(), []);
  const value = useMemo(() => ({ status, lastSyncedAt, error, syncNow }), [error, lastSyncedAt, status, syncNow]);
  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
}

export function useCloudSync(): CloudSyncState {
  const context = useContext(CloudSyncContext);
  if (!context) throw new Error("useCloudSync must be used inside CloudSyncProvider");
  return context;
}
