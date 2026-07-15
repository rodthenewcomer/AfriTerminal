import { Platform } from "react-native";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import { useSettingsStore } from "../stores";
import { legacyStorageKey } from "@wariba/core/legacy";
import { migratedSecureValue } from "../lib/secure-migration";

const ANONYMOUS_ID_KEY = "wariba-analytics-anonymous-id";
const PREVIOUS_ANONYMOUS_ID_KEY = legacyStorageKey("analytics-anonymous-id");
let accessToken: string | null = null;

export function setMobileAnalyticsSession(token: string | null) {
  accessToken = token;
}

async function anonymousId(): Promise<string> {
  const existing = await migratedSecureValue(ANONYMOUS_ID_KEY, PREVIOUS_ANONYMOUS_ID_KEY);
  if (existing) return existing;
  const created = Crypto.randomUUID();
  await SecureStore.setItemAsync(ANONYMOUS_ID_KEY, created, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return created;
}

export async function trackMobileEvent(
  name: "page_view" | "onboarding_complete" | "search" | "ticker_view" | "watchlist_add" | "portfolio_transaction" | "alert_create" | "document_open" | "data_refresh_failure" | "notification_tap" | "auth_complete" | "subscription_started",
  properties?: Record<string, string | number | boolean>,
  path?: string
): Promise<void> {
  if (useSettingsStore.getState().analyticsConsent !== "granted") return;
  if (process.env.EXPO_PUBLIC_ANALYTICS_ENABLED !== "true") return;
  const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!baseUrl) return;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  await fetch(`${baseUrl}/api/v1/events`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      consent: true,
      anonymousId: await anonymousId(),
      events: [{
        name,
        surface: Platform.OS === "ios" ? "ios" : "android",
        path,
        properties,
        occurredAt: new Date().toISOString(),
      }],
    }),
  }).catch(() => undefined);
}
