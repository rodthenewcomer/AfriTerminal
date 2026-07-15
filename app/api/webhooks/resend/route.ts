import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
const MAX_WEBHOOK_BYTES = 256_000;

export async function POST(request: Request) {
  const apiKey = process.env.RESEND_API_KEY;
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");
  if (!apiKey || !webhookSecret || !id || !timestamp || !signature) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_WEBHOOK_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  let event: ReturnType<Resend["webhooks"]["verify"]>;
  try {
    event = new Resend(apiKey).webhooks.verify({ payload: raw, headers: { id, timestamp, signature }, webhookSecret });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const { error: claimError } = await admin.from("notification_provider_events").insert({
    provider: "resend", event_id: id, event_type: event.type,
  });
  if (claimError?.code === "23505") return NextResponse.json({ received: true, duplicate: true });
  if (claimError) return NextResponse.json({ error: "Webhook unavailable" }, { status: 500 });

  try {
    if (event.type.startsWith("email.") && "email_id" in event.data) {
      const emailId = event.data.email_id;
      const { data: delivery, error: readError } = await admin.from("notification_deliveries")
        .select("id,user_id,attempts").eq("channel", "email").eq("provider_id", emailId).maybeSingle();
      if (readError) throw readError;
      if (delivery) {
        if (event.type === "email.delivered") {
          const { error } = await admin.from("notification_deliveries").update({ status: "delivered", last_error: null }).eq("id", delivery.id);
          if (error) throw error;
        } else if (["email.bounced", "email.complained", "email.suppressed"].includes(event.type)) {
          const [deliveryResult, profileResult] = await Promise.all([
            admin.from("notification_deliveries").update({ status: "suppressed", last_error: event.type }).eq("id", delivery.id),
            admin.from("profiles").update({ email_notifications: false }).eq("id", delivery.user_id),
          ]);
          if (deliveryResult.error || profileResult.error) throw deliveryResult.error ?? profileResult.error;
        } else if (event.type === "email.failed") {
          const attempts = Number(delivery.attempts) + 1;
          const { error } = await admin.from("notification_deliveries").update({
            status: attempts >= 5 ? "suppressed" : "failed",
            attempts,
            next_attempt_at: new Date(Date.now() + Math.min(21_600, 60 * 2 ** attempts) * 1_000).toISOString(),
            last_error: "Provider delivery failed",
          }).eq("id", delivery.id);
          if (error) throw error;
        }
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    await admin.from("notification_provider_events").delete().eq("provider", "resend").eq("event_id", id);
    console.error("Resend webhook processing failed", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
