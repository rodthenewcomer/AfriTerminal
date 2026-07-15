"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/auth-provider";
import { ConsentBanner } from "./consent-banner";
import {
  ANALYTICS_CONSENT_KEY,
  type AnalyticsConsent,
  setAnalyticsRuntime,
  trackProductEvent,
} from "@/lib/analytics";

interface AnalyticsState {
  consent: AnalyticsConsent;
  saving: boolean;
  setConsent: (granted: boolean) => Promise<void>;
}

const AnalyticsContext = createContext<AnalyticsState | null>(null);

function readLocalConsent(): AnalyticsConsent {
  if (typeof window === "undefined") return "unknown";
  const value = window.localStorage.getItem(ANALYTICS_CONSENT_KEY);
  return value === "granted" || value === "denied" ? value : "unknown";
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { session, loading } = useAuth();
  const [consent, setConsentState] = useState<AnalyticsConsent>("unknown");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const lastTrackedPath = useRef<string | null>(null);

  useEffect(() => {
    if (loading) return;
    const controller = new AbortController();
    const local = readLocalConsent();
    setReady(false);
    const bootstrap = async () => {
      let resolved = local;
      const token = session?.access_token;
      if (token) {
        const response = await fetch("/api/v1/me", {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.ok) {
          const data = await response.json() as { profile?: { analytics_consent?: boolean | null } };
          const serverConsent = data.profile?.analytics_consent;
          if (typeof serverConsent === "boolean") {
            resolved = serverConsent ? "granted" : "denied";
          } else if (local !== "unknown") {
            const syncResponse = await fetch("/api/v1/preferences", {
              method: "PATCH",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ analyticsConsent: local === "granted" }),
              signal: controller.signal,
            });
            if (!syncResponse.ok) throw new Error("Consent sync failed");
          }
        }
      }
      if (controller.signal.aborted) return;
      window.localStorage.setItem(ANALYTICS_CONSENT_KEY, resolved);
      setConsentState(resolved);
      setAnalyticsRuntime({ accessToken: token ?? null, enabled: resolved === "granted" });
      setReady(true);
    };
    void bootstrap().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setConsentState(local);
      setAnalyticsRuntime({
        accessToken: session?.access_token ?? null,
        enabled: !session?.access_token && local === "granted",
      });
      setReady(true);
    });
    return () => controller.abort();
  }, [loading, session?.access_token]);

  useEffect(() => {
    if (!ready || consent !== "granted" || lastTrackedPath.current === pathname) return;
    lastTrackedPath.current = pathname;
    trackProductEvent("page_view", undefined, pathname);
  }, [consent, pathname, ready]);

  const value = useMemo<AnalyticsState>(() => ({
    consent,
    saving,
    setConsent: async (granted) => {
      setSaving(true);
      try {
        const token = session?.access_token;
        if (token) {
          const response = await fetch("/api/v1/preferences", {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ analyticsConsent: granted }),
          });
          if (!response.ok) throw new Error("Consent update failed");
        }
        const next = granted ? "granted" : "denied";
        window.localStorage.setItem(ANALYTICS_CONSENT_KEY, next);
        setConsentState(next);
        setAnalyticsRuntime({ accessToken: token ?? null, enabled: granted });
      } finally {
        setSaving(false);
      }
    },
  }), [consent, saving, session?.access_token]);

  return (
    <AnalyticsContext.Provider value={value}>
      {children}
      {ready && consent === "unknown" ? (
        <ConsentBanner saving={saving} onChoose={(granted) => void value.setConsent(granted)} />
      ) : null}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics(): AnalyticsState {
  const context = useContext(AnalyticsContext);
  if (!context) throw new Error("useAnalytics must be used inside AnalyticsProvider");
  return context;
}
