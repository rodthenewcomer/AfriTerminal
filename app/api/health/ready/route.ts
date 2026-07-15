import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { error } = await createAdminSupabaseClient().from("profiles").select("id", { head: true }).limit(1);
    if (error) throw error;
    return NextResponse.json({ status: "ready" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "unavailable" }, {
      status: 503,
      headers: { "Cache-Control": "no-store", "Retry-After": "30" },
    });
  }
}
