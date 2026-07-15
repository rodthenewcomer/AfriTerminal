import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Crypto from "expo-crypto";
import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { legacyStorageKey } from "@wariba/core/legacy";
import { migratedSecureValue } from "../lib/secure-migration";

const DEVICE_ID_KEY = "wariba-push-device-id";
const PREVIOUS_DEVICE_ID_KEY = legacyStorageKey("push-device-id");

function apiUrl(): string {
  const value = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, "");
  if (!value) throw new Error("Serveur WARIBA non configuré");
  return value;
}

async function deviceId(): Promise<string> {
  const existing = await migratedSecureValue(DEVICE_ID_KEY, PREVIOUS_DEVICE_ID_KEY);
  if (existing) return existing;
  const created = Crypto.randomUUID();
  await SecureStore.setItemAsync(DEVICE_ID_KEY, created, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
  return created;
}

function projectId(): string {
  const fromConfig = Constants.expoConfig?.extra?.eas?.projectId;
  const value = process.env.EXPO_PUBLIC_EAS_PROJECT_ID || (typeof fromConfig === "string" ? fromConfig : "");
  if (!value) throw new Error("Identifiant EAS manquant");
  return value;
}

export async function registerPushDevice(accessToken: string): Promise<void> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return;
  const pushToken = await Notifications.getExpoPushTokenAsync({ projectId: projectId() });
  const response = await fetch(`${apiUrl()}/api/v1/devices`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ deviceId: await deviceId(), platform: Platform.OS, token: pushToken.data }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? "Enregistrement push impossible");
  }
}

export async function unregisterPushDevice(accessToken: string): Promise<void> {
  const id = await migratedSecureValue(DEVICE_ID_KEY, PREVIOUS_DEVICE_ID_KEY);
  if (!id) return;
  let serverError: Error | null = null;
  try {
    const response = await fetch(`${apiUrl()}/api/v1/devices`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ deviceId: id }),
    });
    if (!response.ok && response.status !== 404) serverError = new Error("Désinscription push impossible");
  } catch {
    serverError = new Error("Désinscription push impossible");
  } finally {
    if (Platform.OS === "ios" || Platform.OS === "android") {
      await Notifications.unregisterForNotificationsAsync().catch(() => undefined);
    }
  }
  if (serverError) throw serverError;
}
