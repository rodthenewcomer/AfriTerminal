import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError, requireApiUser } from "@/lib/supabase/api";
import { consumeRateLimit } from "@/lib/server/request-security";

export const dynamic = "force-dynamic";

const deviceSchema = z.object({
  deviceId: z.string().trim().min(8).max(200),
  platform: z.enum(["ios", "android"]),
  token: z.string().regex(/^(Expo|Exponent)PushToken\[[A-Za-z0-9_-]+\]$/).max(512),
}).strict();
const removeSchema = z.object({ deviceId: z.string().trim().min(8).max(200) }).strict();

export async function POST(request: Request) {
  try {
    const { client, user } = await requireApiUser(request);
    if (!await consumeRateLimit("devices", user.id, 20, 60)) {
      return NextResponse.json({ error: "Trop de requêtes" }, { status: 429, headers: { "Retry-After": "60" } });
    }
    const parsed = deviceSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Appareil invalide" }, { status: 400 });
    const now = new Date().toISOString();
    const { error } = await client.from("device_push_tokens").upsert({
      user_id: user.id,
      device_id: parsed.data.deviceId,
      platform: parsed.data.platform,
      token: parsed.data.token,
      disabled: false,
      last_seen_at: now,
      updated_at: now,
    }, { onConflict: "user_id,device_id" });
    if (error) throw error;
    const { error: profileError } = await client.from("profiles").update({ push_notifications: true }).eq("id", user.id);
    if (profileError) throw profileError;
    return NextResponse.json({ registered: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { client, user } = await requireApiUser(request);
    if (!await consumeRateLimit("devices", user.id, 20, 60)) {
      return NextResponse.json({ error: "Trop de requêtes" }, { status: 429, headers: { "Retry-After": "60" } });
    }
    const parsed = removeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Appareil invalide" }, { status: 400 });
    const { error } = await client.from("device_push_tokens").update({ disabled: true })
      .eq("user_id", user.id).eq("device_id", parsed.data.deviceId);
    if (error) throw error;
    const { count, error: countError } = await client.from("device_push_tokens")
      .select("device_id", { count: "exact", head: true }).eq("user_id", user.id).eq("disabled", false);
    if (countError) throw countError;
    if (!count) {
      const { error: profileError } = await client.from("profiles").update({ push_notifications: false }).eq("id", user.id);
      if (profileError) throw profileError;
    }
    return NextResponse.json({ registered: false });
  } catch (error) {
    return apiError(error);
  }
}
