import "react-native-url-polyfill/auto";
import { AppState } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createClient, processLock, type SupportedStorage } from "@supabase/supabase-js";
import { legacyStorageKey } from "@wariba/core/legacy";

const CHUNK_SIZE = 1800;
let refreshListenerInstalled = false;

function storageKey(key: string): string {
  return `wariba.auth.${key.replace(/[^A-Za-z0-9._-]/g, "_")}`;
}

function previousStorageKey(key: string): string {
  return legacyStorageKey(`auth.${key.replace(/[^A-Za-z0-9._-]/g, "_")}`, ".");
}

async function readChunked(base: string): Promise<string | null> {
  const count = Number(await SecureStore.getItemAsync(`${base}.chunks`));
  if (!Number.isInteger(count) || count <= 0) return null;
  const chunks = await Promise.all(
    Array.from({ length: count }, (_, index) => SecureStore.getItemAsync(`${base}.${index}`))
  );
  return chunks.every((chunk): chunk is string => chunk !== null) ? chunks.join("") : null;
}

async function removeChunked(base: string): Promise<void> {
  const count = Number(await SecureStore.getItemAsync(`${base}.chunks`)) || 0;
  await Promise.all([
    ...Array.from({ length: count }, (_, index) => SecureStore.deleteItemAsync(`${base}.${index}`)),
    SecureStore.deleteItemAsync(`${base}.chunks`),
  ]);
}

const secureStorage: SupportedStorage = {
  async getItem(key) {
    const base = storageKey(key);
    const current = await readChunked(base);
    if (current !== null) return current;
    const previousBase = previousStorageKey(key);
    const previous = await readChunked(previousBase);
    if (previous !== null) {
      await secureStorage.setItem(key, previous);
      await removeChunked(previousBase);
    }
    return previous;
  },
  async setItem(key, value) {
    const base = storageKey(key);
    const previousCount = Number(await SecureStore.getItemAsync(`${base}.chunks`)) || 0;
    const chunks = Array.from(
      { length: Math.ceil(value.length / CHUNK_SIZE) },
      (_, index) => value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE)
    );
    await Promise.all(chunks.map((chunk, index) => SecureStore.setItemAsync(`${base}.${index}`, chunk)));
    await SecureStore.setItemAsync(`${base}.chunks`, String(chunks.length));
    await Promise.all(
      Array.from({ length: Math.max(0, previousCount - chunks.length) }, (_, index) =>
        SecureStore.deleteItemAsync(`${base}.${chunks.length + index}`)
      )
    );
  },
  async removeItem(key) {
    await Promise.all([
      removeChunked(storageKey(key)),
      removeChunked(previousStorageKey(key)),
    ]);
  },
};

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const mobileSupabase = url && publishableKey
  ? createClient(url, publishableKey, {
      auth: {
        storage: secureStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: "pkce",
        lock: processLock,
      },
    })
  : null;

export function installAuthAutoRefresh(): () => void {
  if (!mobileSupabase || refreshListenerInstalled) return () => undefined;
  refreshListenerInstalled = true;
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") mobileSupabase.auth.startAutoRefresh();
    else mobileSupabase.auth.stopAutoRefresh();
  });
  return () => {
    refreshListenerInstalled = false;
    subscription.remove();
  };
}
