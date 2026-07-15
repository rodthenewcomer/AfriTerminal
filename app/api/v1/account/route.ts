import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/supabase/api";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/billing";
import { consumeRateLimit } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  try {
    const { user } = await requireApiUser(request);
    if (!await consumeRateLimit("account-delete", user.id, 3, 3_600)) {
      return NextResponse.json({ error: "Trop de tentatives" }, { status: 429, headers: { "Retry-After": "3600" } });
    }
    if (request.headers.get("x-confirm-account-deletion") !== "delete") {
      return NextResponse.json({ error: "Confirmation de suppression manquante." }, { status: 400 });
    }
    const lastSignIn = Date.parse(user.last_sign_in_at ?? "");
    if (!Number.isFinite(lastSignIn) || Date.now() - lastSignIn > 15 * 60 * 1000) {
      return NextResponse.json(
        { error: "Reconnectez-vous avant de supprimer définitivement le compte.", code: "reauthentication_required" },
        { status: 403 }
      );
    }
    const admin = createAdminSupabaseClient();
    const { data: subscriptions, error: subscriptionError } = await admin
      .from("subscriptions")
      .select("provider,provider_subscription_id,status")
      .eq("user_id", user.id);
    if (subscriptionError) throw subscriptionError;

    for (const subscription of subscriptions ?? []) {
      if (
        subscription.provider === "stripe" &&
        subscription.provider_subscription_id &&
        ["active", "trialing", "past_due", "paused"].includes(subscription.status)
      ) {
        await getStripe().subscriptions.cancel(subscription.provider_subscription_id);
      }
    }

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) throw error;
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return apiError(error);
  }
}
