import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { verifyBearerSecret } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!verifyBearerSecret(request, "OPS_SECRET")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const admin = createAdminSupabaseClient();
    const since7d = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const statuses = ["pending", "sent", "delivered", "failed", "suppressed"] as const;
    const [events7d, events30d, users30d, ...deliveryResults] = await Promise.all([
      admin.from("product_events").select("id", { count: "exact", head: true }).gte("received_at", since7d),
      admin.from("product_events").select("id", { count: "exact", head: true }).gte("received_at", since30d),
      admin.from("product_events").select("user_id", { count: "exact", head: true }).not("user_id", "is", null).gte("received_at", since30d),
      ...statuses.map((status) => admin.from("notification_deliveries").select("id", { count: "exact", head: true }).eq("status", status).gte("created_at", since30d)),
    ]);
    const error = events7d.error ?? events30d.error ?? users30d.error ?? deliveryResults.find((result) => result.error)?.error;
    if (error) throw error;
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      analytics: { events7d: events7d.count ?? 0, events30d: events30d.count ?? 0, authenticatedEvents30d: users30d.count ?? 0 },
      notifications30d: Object.fromEntries(statuses.map((status, index) => [status, deliveryResults[index]?.count ?? 0])),
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Operations metrics failed", error);
    return NextResponse.json({ error: "Metrics unavailable" }, { status: 503 });
  }
}
