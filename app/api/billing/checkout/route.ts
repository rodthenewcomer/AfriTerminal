import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/supabase/api";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getProPriceId, getStripe } from "@/lib/billing";
import { SITE_URL } from "@/lib/site";
import { consumeRateLimit } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { user } = await requireApiUser(request);
    if (!await consumeRateLimit("billing-checkout", user.id, 5, 300)) {
      return NextResponse.json({ error: "Trop de tentatives" }, { status: 429, headers: { "Retry-After": "300" } });
    }
    const key = request.headers.get("idempotency-key");
    if (!key || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) {
      return NextResponse.json({ error: "Clé d'idempotence invalide." }, { status: 400 });
    }
    const stripe = getStripe();
    const priceId = getProPriceId();
    const admin = createAdminSupabaseClient();
    const { data: subscriptions, error } = await admin
      .from("subscriptions")
      .select("provider,provider_customer_id,status")
      .eq("user_id", user.id);
    if (error) throw error;
    if ((subscriptions ?? []).some((item) => ["active", "trialing", "past_due", "paused"].includes(item.status))) {
      return NextResponse.json({ error: "Un abonnement est déjà associé à ce compte." }, { status: 409 });
    }

    let customerId = subscriptions?.find((item) => item.provider === "stripe")?.provider_customer_id ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { wariba_user_id: user.id },
      }, { idempotencyKey: `customer_${user.id}` });
      customerId = customer.id;
      const { error: saveError } = await admin.from("subscriptions").upsert({
        user_id: user.id,
        provider: "stripe",
        provider_customer_id: customerId,
        status: "inactive",
        plan: "free",
      }, { onConflict: "user_id,provider" });
      if (saveError) throw saveError;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${SITE_URL}/account?checkout=success`,
      cancel_url: `${SITE_URL}/pricing?checkout=canceled`,
      metadata: { wariba_user_id: user.id, plan: "pro" },
      subscription_data: { metadata: { wariba_user_id: user.id, plan: "pro" } },
    }, { idempotencyKey: `checkout_${user.id}_${key}` });

    if (!session.url) throw new Error("Stripe did not return a Checkout URL");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return apiError(error);
  }
}
