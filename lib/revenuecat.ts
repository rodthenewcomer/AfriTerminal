import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recomputeEntitlements } from "./billing";

const entitlementSchema = z.object({
  expires_date: z.string().nullable(),
  product_identifier: z.string().min(1),
});

const subscriptionSchema = z.object({
  billing_issues_detected_at: z.string().nullable().optional(),
  expires_date: z.string().nullable(),
  period_type: z.string().nullable().optional(),
  store: z.string().min(1),
  unsubscribe_detected_at: z.string().nullable().optional(),
});

const subscriberSchema = z.object({
  subscriber: z.object({
    entitlements: z.record(z.string(), entitlementSchema),
    subscriptions: z.record(z.string(), subscriptionSchema),
  }),
});

export type NativeBillingProvider = "apple" | "google";

export interface RevenueCatBillingState {
  provider: NativeBillingProvider | null;
  status: "inactive" | "trialing" | "active" | "past_due" | "canceled";
  paid: boolean;
  productId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export function revenueCatProvider(store: string | null | undefined): NativeBillingProvider | null {
  const normalized = store?.toLowerCase();
  if (normalized === "app_store" || normalized === "app_store_sandbox") return "apple";
  if (normalized === "play_store" || normalized === "play_store_sandbox") return "google";
  return null;
}

export function parseRevenueCatBillingState(payload: unknown, now = Date.now()): RevenueCatBillingState {
  const { subscriber } = subscriberSchema.parse(payload);
  const entitlementId = process.env.REVENUECAT_ENTITLEMENT_ID || "pro";
  const entitlement = subscriber.entitlements[entitlementId];
  const productId = entitlement?.product_identifier ?? null;
  const subscription = productId ? subscriber.subscriptions[productId] : Object.values(subscriber.subscriptions)[0];
  const provider = revenueCatProvider(subscription?.store);
  const expiration = entitlement?.expires_date ? Date.parse(entitlement.expires_date) : null;
  const paid = Boolean(entitlement) && (expiration === null || (Number.isFinite(expiration) && expiration > now));
  const hasBillingIssue = Boolean(subscription?.billing_issues_detected_at);
  const cancelAtPeriodEnd = Boolean(subscription?.unsubscribe_detected_at);
  const trial = subscription?.period_type?.toLowerCase() === "trial";

  return {
    provider,
    status: !paid ? "canceled" : hasBillingIssue ? "past_due" : trial ? "trialing" : "active",
    paid: paid && !hasBillingIssue,
    productId,
    currentPeriodEnd: entitlement?.expires_date ?? subscription?.expires_date ?? null,
    cancelAtPeriodEnd,
  };
}

async function fetchRevenueCatSubscriber(userId: string): Promise<RevenueCatBillingState> {
  const secret = process.env.REVENUECAT_SECRET_API_KEY;
  if (!secret) throw new Error("RevenueCat is not configured");
  const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${secret}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`RevenueCat subscriber lookup failed (${response.status})`);
  return parseRevenueCatBillingState(await response.json());
}

export async function syncRevenueCatSubscriber(admin: SupabaseClient, userId: string): Promise<RevenueCatBillingState> {
  const state = await fetchRevenueCatSubscriber(userId);
  const now = new Date().toISOString();
  const { error: resetError } = await admin
    .from("subscriptions")
    .update({ status: "canceled", plan: "free", cancel_at_period_end: false, updated_at: now })
    .eq("user_id", userId)
    .in("provider", ["apple", "google"]);
  if (resetError) throw resetError;
  if (state.provider) {
    const { error } = await admin.from("subscriptions").upsert({
      user_id: userId,
      provider: state.provider,
      provider_customer_id: userId,
      provider_subscription_id: null,
      status: state.status,
      plan: state.paid ? "pro" : "free",
      price_id: state.productId,
      current_period_end: state.currentPeriodEnd,
      cancel_at_period_end: state.cancelAtPeriodEnd,
      updated_at: now,
    }, { onConflict: "user_id,provider" });
    if (error) throw error;
  }
  await recomputeEntitlements(admin, userId);
  return state;
}
