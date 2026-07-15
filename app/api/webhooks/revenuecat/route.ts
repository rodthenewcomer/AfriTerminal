import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { revenueCatProvider, syncRevenueCatSubscriber } from "@/lib/revenuecat";

export const dynamic = "force-dynamic";

const webhookSchema = z.object({
  event: z.object({
    app_user_id: z.string().optional(),
    id: z.string().min(1).max(200),
    store: z.string().optional(),
    transferred_from: z.array(z.string()).max(20).optional(),
    transferred_to: z.array(z.string()).max(20).optional(),
    type: z.string().min(1).max(100),
  }).passthrough(),
}).passthrough();

function authorized(actual: string | null, expected: string): boolean {
  if (!actual) return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const secret = process.env.REVENUECAT_WEBHOOK_AUTH;
  if (!secret) return NextResponse.json({ error: "Webhook non configuré." }, { status: 503 });
  if (!authorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Autorisation webhook invalide." }, { status: 401 });
  }

  const parsed = webhookSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Événement invalide." }, { status: 400 });
  const { event } = parsed.data;
  const provider = revenueCatProvider(event.store);
  const candidateIds = event.type === "TRANSFER"
    ? [...(event.transferred_from ?? []), ...(event.transferred_to ?? [])]
    : event.app_user_id ? [event.app_user_id] : [];
  const userIds = [...new Set(candidateIds.filter((id) => z.string().uuid().safeParse(id).success))];
  if (userIds.length === 0 || !provider) {
    return NextResponse.json({ received: true, ignored: true });
  }

  try {
    const admin = createAdminSupabaseClient();
    const { data: seen, error: seenError } = await admin
      .from("billing_webhook_events")
      .select("event_id")
      .eq("provider", provider)
      .eq("event_id", event.id)
      .maybeSingle();
    if (seenError) throw seenError;
    if (seen) return NextResponse.json({ received: true, duplicate: true });

    for (const userId of userIds) await syncRevenueCatSubscriber(admin, userId);
    const { error } = await admin.from("billing_webhook_events").insert({
      provider,
      event_id: event.id,
      event_type: event.type,
    });
    if (error && error.code !== "23505") throw error;
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("RevenueCat webhook processing failed", error);
    return NextResponse.json({ error: "Traitement webhook échoué." }, { status: 500 });
  }
}
