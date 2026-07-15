import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/supabase/api";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/billing";
import { SITE_URL } from "@/lib/site";
import { consumeRateLimit } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { user } = await requireApiUser(request);
    if (!await consumeRateLimit("billing-portal", user.id, 10, 300)) {
      return NextResponse.json({ error: "Trop de tentatives" }, { status: 429, headers: { "Retry-After": "300" } });
    }
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("subscriptions")
      .select("provider_customer_id")
      .eq("user_id", user.id)
      .eq("provider", "stripe")
      .single();
    if (error || !data.provider_customer_id) {
      return NextResponse.json({ error: "Aucun compte de facturation actif." }, { status: 404 });
    }
    const session = await getStripe().billingPortal.sessions.create({
      customer: data.provider_customer_id,
      return_url: `${SITE_URL}/account`,
    });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return apiError(error);
  }
}
