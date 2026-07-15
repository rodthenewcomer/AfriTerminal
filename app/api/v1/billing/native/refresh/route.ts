import { NextResponse } from "next/server";
import { apiError, requireApiUser } from "@/lib/supabase/api";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { syncRevenueCatSubscriber } from "@/lib/revenuecat";
import { consumeRateLimit } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { user } = await requireApiUser(request);
    if (!await consumeRateLimit("billing-native-refresh", user.id, 10, 300)) {
      return NextResponse.json({ error: "Trop de tentatives" }, { status: 429, headers: { "Retry-After": "300" } });
    }
    const state = await syncRevenueCatSubscriber(createAdminSupabaseClient(), user.id);
    return NextResponse.json({ subscription: state }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
