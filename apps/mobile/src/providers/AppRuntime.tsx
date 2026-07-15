import { useEffect, useRef } from "react";
import { usePathname } from "expo-router";
import { useMobileAuth } from "./AuthProvider";
import { enableNotifications } from "../services/alerts";
import { setMobileAnalyticsSession, trackMobileEvent } from "../services/analytics";
import { useSettingsStore } from "../stores";

export function AppRuntime() {
  const pathname = usePathname();
  const { session } = useMobileAuth();
  const notifications = useSettingsStore((state) => state.notifications);
  const consent = useSettingsStore((state) => state.analyticsConsent);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const token = session?.access_token ?? null;
    setMobileAnalyticsSession(null);
    if (token && notifications) void enableNotifications(token).catch(() => undefined);
    if (!token) return;
    const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
    if (!baseUrl) return;
    const controller = new AbortController();
    void fetch(`${baseUrl}/api/v1/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) return;
      const body = await response.json() as { profile?: { analytics_consent?: boolean | null } };
      const serverConsent = body.profile?.analytics_consent;
      if (typeof serverConsent === "boolean") {
        useSettingsStore.getState().setAnalyticsConsent(serverConsent ? "granted" : "denied");
        setMobileAnalyticsSession(token);
      } else {
        const localConsent = useSettingsStore.getState().analyticsConsent;
        if (localConsent !== "unknown") {
          const response = await fetch(`${baseUrl}/api/v1/preferences`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ analyticsConsent: localConsent === "granted" }),
            signal: controller.signal,
          });
          if (response.ok) setMobileAnalyticsSession(token);
        }
      }
    }).catch(() => undefined);
    return () => controller.abort();
  }, [notifications, session?.access_token]);

  useEffect(() => {
    if (consent !== "granted" || lastPath.current === pathname) return;
    lastPath.current = pathname;
    void trackMobileEvent("page_view", undefined, pathname);
  }, [consent, pathname]);

  return null;
}
