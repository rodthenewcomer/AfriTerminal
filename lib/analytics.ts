"use client";

export type AnalyticsConsent = "unknown" | "granted" | "denied";
export type ProductEventName =
  | "page_view" | "onboarding_complete" | "search" | "ticker_view"
  | "watchlist_add" | "portfolio_transaction" | "alert_create"
  | "document_open" | "data_refresh_failure" | "notification_tap"
  | "auth_complete" | "subscription_started";

export const ANALYTICS_CONSENT_KEY = "afriterminal-analytics-consent";
const ANONYMOUS_ID_KEY = "afriterminal-anonymous-id";
let accessToken: string | null = null;
let enabled = false;

export function setAnalyticsRuntime(next: { accessToken: string | null; enabled: boolean }) {
  accessToken = next.accessToken;
  enabled = next.enabled;
}

function anonymousId(): string | null {
  if (typeof window === "undefined") return null;
  const existing = window.localStorage.getItem(ANONYMOUS_ID_KEY);
  if (existing && existing.length >= 16 && existing.length <= 100) return existing;
  const created = globalThis.crypto.randomUUID();
  window.localStorage.setItem(ANONYMOUS_ID_KEY, created);
  return created;
}

export function trackProductEvent(
  name: ProductEventName,
  properties?: Record<string, string | number | boolean>,
  path?: string
) {
  if (!enabled || process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "true" || typeof window === "undefined") return;
  const id = anonymousId();
  if (!id) return;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  void fetch("/api/v1/events", {
    method: "POST",
    headers,
    body: JSON.stringify({
      consent: true,
      anonymousId: id,
      events: [{ name, surface: "web", path, properties, occurredAt: new Date().toISOString() }],
    }),
    credentials: "same-origin",
    keepalive: true,
  }).catch(() => undefined);
}
