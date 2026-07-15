import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireApiUser } from "@/lib/supabase/api";
import { consumeRateLimit } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";

const preferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  analyticsConsent: z.boolean().nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

export async function PATCH(request: Request) {
  try {
    const { client, user } = await requireApiUser(request);
    if (!await consumeRateLimit("preferences", user.id, 30, 60)) {
      return NextResponse.json({ error: "Trop de requêtes" }, { status: 429, headers: { "Retry-After": "60" } });
    }
    const parsed = preferencesSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Préférences invalides" }, { status: 400 });
    const update: Record<string, unknown> = {};
    if (parsed.data.emailNotifications !== undefined) update.email_notifications = parsed.data.emailNotifications;
    if (parsed.data.pushNotifications !== undefined) update.push_notifications = parsed.data.pushNotifications;
    if (parsed.data.analyticsConsent !== undefined) {
      update.analytics_consent = parsed.data.analyticsConsent;
      update.analytics_consent_at = parsed.data.analyticsConsent === null ? null : new Date().toISOString();
    }
    const { data, error } = await client.from("profiles").update(update).eq("id", user.id)
      .select("email_notifications,push_notifications,analytics_consent,analytics_consent_at").single();
    if (error) throw error;
    return NextResponse.json({ preferences: data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
