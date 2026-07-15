import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicEnv } from "./env";

export function createBrowserSupabaseClient() {
  const { url, publishableKey } = getSupabasePublicEnv();
  return createBrowserClient(url, publishableKey);
}
