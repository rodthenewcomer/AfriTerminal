import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser, apiError } from "@/lib/supabase/api";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { consumeRateLimit, hashPrivateIdentifier, requestAddress } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";
const MAX_BODY_BYTES = 32_768;

const primitive = z.union([z.string().max(200), z.number().finite(), z.boolean()]);
const eventSchema = z.object({
  name: z.enum([
    "page_view", "onboarding_complete", "search", "ticker_view",
    "watchlist_add", "portfolio_transaction", "alert_create",
    "document_open", "data_refresh_failure", "notification_tap",
    "auth_complete", "subscription_started",
  ]),
  surface: z.enum(["web", "ios", "android"]),
  path: z.string().startsWith("/").max(160).optional(),
  properties: z.record(z.string().max(40), primitive).refine((value) => Object.keys(value).length <= 20).optional(),
  occurredAt: z.iso.datetime({ offset: true }),
}).strict();

const bodySchema = z.object({
  consent: z.literal(true),
  anonymousId: z.string().trim().min(16).max(100),
  events: z.array(eventSchema).min(1).max(20),
}).strict();

export async function POST(request: Request) {
  try {
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }
    let payload: unknown;
    try {
      payload = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = bodySchema.safeParse(payload);
    if (!parsed.success) return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });

    let userId: string | null = null;
    if (request.headers.has("authorization")) {
      const { user } = await requireApiUser(request);
      userId = user.id;
    }
    const identifier = userId ?? requestAddress(request);
    if (!await consumeRateLimit("events", identifier, 120, 60)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
    }

    const admin = createAdminSupabaseClient();
    if (userId) {
      const { data, error } = await admin.from("profiles").select("analytics_consent").eq("id", userId).single();
      if (error || data?.analytics_consent !== true) {
        return NextResponse.json({ error: "Analytics consent required" }, { status: 403 });
      }
    }
    const anonymousIdHash = hashPrivateIdentifier(parsed.data.anonymousId, "analytics");
    const receivedAt = Date.now();
    const events = parsed.data.events.filter((event) => {
      const occurred = Date.parse(event.occurredAt);
      return occurred <= receivedAt + 5 * 60_000 && occurred >= receivedAt - 7 * 86_400_000;
    });
    if (!events.length) return NextResponse.json({ accepted: 0 }, { status: 202 });
    const { error } = await admin.from("product_events").insert(events.map((event) => ({
      user_id: userId,
      anonymous_id_hash: anonymousIdHash,
      name: event.name,
      surface: event.surface,
      path: event.path ?? null,
      properties: event.properties ?? {},
      occurred_at: event.occurredAt,
    })));
    if (error) throw error;
    return NextResponse.json({ accepted: events.length }, { status: 202 });
  } catch (error) {
    return apiError(error);
  }
}
