import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

let stripe: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured");
  stripe ??= new Stripe(key, { appInfo: { name: "WARIBA", version: "0.1.0" } });
  return stripe;
}

export function getProPriceId(): string {
  const priceId = process.env.STRIPE_PRICE_PRO_MONTHLY;
  if (!priceId) throw new Error("Stripe Pro price is not configured");
  return priceId;
}

export const FREE_ENTITLEMENTS = [
  { key: "cloud_sync", enabled: true, numeric_limit: null },
  { key: "watchlists", enabled: true, numeric_limit: 5 },
  { key: "price_alerts", enabled: true, numeric_limit: 3 },
  { key: "saved_filters", enabled: true, numeric_limit: 3 },
  { key: "portfolio", enabled: true, numeric_limit: null },
  { key: "advanced_alerts", enabled: false, numeric_limit: 0 },
  { key: "research_exports", enabled: false, numeric_limit: 0 },
] as const;

export const PRO_ENTITLEMENTS = [
  { key: "cloud_sync", enabled: true, numeric_limit: null },
  { key: "watchlists", enabled: true, numeric_limit: null },
  { key: "price_alerts", enabled: true, numeric_limit: 100 },
  { key: "saved_filters", enabled: true, numeric_limit: null },
  { key: "portfolio", enabled: true, numeric_limit: null },
  { key: "advanced_alerts", enabled: true, numeric_limit: 100 },
  { key: "research_exports", enabled: true, numeric_limit: null },
] as const;

export async function recomputeEntitlements(admin: SupabaseClient, userId: string): Promise<void> {
  const { data, error } = await admin
    .from("subscriptions")
    .select("provider,status,updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;

  const active = (data ?? []).find((item) => ["active", "trialing"].includes(item.status));
  const entitlements = active ? PRO_ENTITLEMENTS : FREE_ENTITLEMENTS;
  const { error: entitlementError } = await admin.from("entitlements").upsert(
    entitlements.map((item) => ({
      user_id: userId,
      ...item,
      source: active?.provider ?? "free",
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "user_id,key" }
  );
  if (entitlementError) throw entitlementError;
}
