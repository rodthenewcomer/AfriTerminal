import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv, getSupabaseSecretKey } from "./env";

export function createAdminSupabaseClient() {
  const { url } = getSupabasePublicEnv();
  return createClient(url, getSupabaseSecretKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
