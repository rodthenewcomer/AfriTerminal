import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { apiError, requireApiUser } from "@/lib/supabase/api";
import { consumeRateLimit } from "@/lib/server/request-security";
import { getSgi } from "@wariba/core/sgi";

export const dynamic = "force-dynamic";

const questionnaireSchema = z.object({
  contactPreference: z.enum(["digital", "phone", "office"]),
  experience: z.enum(["beginner", "experienced"]),
  priority: z.enum(["fees", "digital", "support"]),
  amount: z.enum(["under-500k", "500k-5m", "over-5m"]),
}).strict();

const requestSchema = z.object({
  sgiId: z.string().trim().min(2).max(100),
  consent: z.literal(true),
  questionnaire: questionnaireSchema,
}).strict();

const savedRequestSchema = z.object({
  id: z.string().uuid(),
  sgi_id: z.string().trim().min(2).max(100),
  status: z.enum(["pending", "contacted", "closed", "cancelled"]),
  questionnaire: questionnaireSchema,
  consent_at: z.string().datetime({ offset: true }),
  created_at: z.string().datetime({ offset: true }),
  updated_at: z.string().datetime({ offset: true }),
}).strict();

function settingsAndRequests(value: unknown) {
  const settings = value && !Array.isArray(value) && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
  const parsed = z.array(savedRequestSchema).max(100).safeParse(settings.sgiRequests);
  return { settings, requests: parsed.success ? parsed.data : [] };
}

export async function GET(request: Request) {
  try {
    const { client, user } = await requireApiUser(request);
    const { data, error } = await client
      .from("user_preferences")
      .select("value")
      .eq("user_id", user.id)
      .eq("key", "settings")
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ requests: settingsAndRequests(data?.value).requests });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { client, user } = await requireApiUser(request);
    if (!await consumeRateLimit("sgi-request", user.id, 10, 3_600)) {
      return NextResponse.json(
        { error: "Trop de demandes. Réessayez dans une heure." },
        { status: 429, headers: { "Retry-After": "3600" } }
      );
    }
    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success || !getSgi(parsed.data.sgiId)) {
      return NextResponse.json({ error: "Demande SGI invalide." }, { status: 400 });
    }
    const { data: preference, error: preferenceError } = await client
      .from("user_preferences")
      .select("value")
      .eq("user_id", user.id)
      .eq("key", "settings")
      .maybeSingle();
    if (preferenceError) throw preferenceError;
    const { settings, requests } = settingsAndRequests(preference?.value);
    const existing = requests.find((item) =>
      item.sgi_id === parsed.data.sgiId
      && (item.status === "pending" || item.status === "contacted")
    );
    if (existing) return NextResponse.json({ request: existing }, { status: 200 });

    const now = new Date().toISOString();
    const savedRequest = {
      id: randomUUID(),
      sgi_id: parsed.data.sgiId,
      status: "pending" as const,
      questionnaire: parsed.data.questionnaire,
      consent_at: now,
      created_at: now,
      updated_at: now,
    };
    const { error } = await client
      .from("user_preferences")
      .upsert({
        user_id: user.id,
        key: "settings",
        value: { ...settings, sgiRequests: [savedRequest, ...requests].slice(0, 100) },
        updated_at: now,
      }, { onConflict: "user_id,key" });
    if (error) throw error;
    return NextResponse.json({ request: savedRequest }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
