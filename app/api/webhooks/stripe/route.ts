import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getStripe, recomputeEntitlements } from "@/lib/billing";

export const dynamic = "force-dynamic";

function customerId(subscription: Stripe.Subscription): string {
  return typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id;
}

function periodEnd(subscription: Stripe.Subscription): string | null {
  const seconds = subscription.items.data.reduce(
    (latest, item) => Math.max(latest, item.current_period_end ?? 0),
    0
  );
  return seconds > 0 ? new Date(seconds * 1000).toISOString() : null;
}

async function syncSubscription(subscription: Stripe.Subscription) {
  const admin = createAdminSupabaseClient();
  const providerCustomerId = customerId(subscription);
  let userId = subscription.metadata.afriterminal_user_id;
  if (!userId) {
    const { data } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("provider", "stripe")
      .eq("provider_customer_id", providerCustomerId)
      .maybeSingle();
    userId = data?.user_id;
  }
  if (!userId) throw new Error("Stripe subscription is missing its WARIBA owner");

  const { data: owner, error: ownerError } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();
  if (ownerError) throw ownerError;
  if (!owner) return;

  const paid = ["active", "trialing"].includes(subscription.status);
  const { error: subscriptionError } = await admin.from("subscriptions").upsert({
    user_id: userId,
    provider: "stripe",
    provider_customer_id: providerCustomerId,
    provider_subscription_id: subscription.id,
    status: subscription.status,
    plan: paid ? "pro" : "free",
    price_id: subscription.items.data[0]?.price.id ?? null,
    current_period_end: periodEnd(subscription),
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,provider" });
  if (subscriptionError) throw subscriptionError;
  await recomputeEntitlements(admin, userId);
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Webhook non configuré." }, { status: 503 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: "Signature webhook invalide." }, { status: 400 });
  }

  try {
    const admin = createAdminSupabaseClient();
    const { data: seen, error: seenError } = await admin
      .from("billing_webhook_events")
      .select("event_id")
      .eq("provider", "stripe")
      .eq("event_id", event.id)
      .maybeSingle();
    if (seenError) throw seenError;
    if (seen) return NextResponse.json({ received: true, duplicate: true });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata?.afriterminal_user_id ?? session.client_reference_id;
      const customer = typeof session.customer === "string" ? session.customer : session.customer?.id;
      if (userId && customer) {
        const { error } = await admin.from("subscriptions").upsert({
          user_id: userId,
          provider: "stripe",
          provider_customer_id: customer,
          provider_subscription_id: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,provider" });
        if (error) throw error;
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (subscriptionId) {
          await syncSubscription(await getStripe().subscriptions.retrieve(subscriptionId));
        }
      }
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      await syncSubscription(event.data.object);
    }

    const { error: recordError } = await admin.from("billing_webhook_events").insert({
      provider: "stripe",
      event_id: event.id,
      event_type: event.type,
    });
    if (recordError && recordError.code !== "23505") throw recordError;
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed", error);
    return NextResponse.json({ error: "Traitement webhook échoué." }, { status: 500 });
  }
}
