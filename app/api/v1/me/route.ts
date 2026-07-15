import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/supabase/api";
import { consumeRateLimit } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { client, user } = await requireApiUser(request);
    if (!await consumeRateLimit("me-read", user.id, 60, 60)) {
      return NextResponse.json({ error: "Trop de requêtes" }, { status: 429, headers: { "Retry-After": "60" } });
    }
    const [profile, subscriptions, entitlements] = await Promise.all([
      client.from("profiles").select("display_name,experience_level,locale,email_notifications,push_notifications,analytics_consent,analytics_consent_at,created_at").eq("id", user.id).single(),
      client.from("subscriptions").select("provider,status,plan,current_period_end,cancel_at_period_end,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }),
      client.from("entitlements").select("key,enabled,numeric_limit,source").eq("user_id", user.id),
    ]);
    if (profile.error || subscriptions.error || entitlements.error) {
      throw new Error(profile.error?.message ?? subscriptions.error?.message ?? entitlements.error?.message);
    }
    const subscription = subscriptions.data?.find((item) => ["active", "trialing"].includes(item.status))
      ?? subscriptions.data?.[0]
      ?? { provider: "stripe", status: "inactive", plan: "free", current_period_end: null, cancel_at_period_end: false };
    return NextResponse.json({
      user: { id: user.id, email: user.email },
      profile: profile.data,
      subscription,
      entitlements: entitlements.data,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
