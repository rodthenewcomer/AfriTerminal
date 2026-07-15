import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

function requiredSecret(name: string): string {
  const value = process.env[name];
  if (!value || value.length < 32) throw new Error(`${name} must contain at least 32 characters`);
  return value;
}

export function hashPrivateIdentifier(value: string, purpose: "analytics" | "rate-limit"): string {
  const secretName = purpose === "analytics" ? "ANALYTICS_HASH_SECRET" : "RATE_LIMIT_HASH_SECRET";
  return createHmac("sha256", requiredSecret(secretName)).update(`${purpose}:${value}`).digest("hex");
}

export function requestAddress(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")?.trim()
    || "unknown";
}

export async function consumeRateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const bucket = hashPrivateIdentifier(`${scope}:${identifier}`, "rate-limit");
  const { data, error } = await createAdminSupabaseClient().rpc("consume_api_rate_limit", {
    p_bucket_key: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("Rate-limit check failed", { scope, code: error.code });
    return false;
  }
  return data === true;
}

export function verifyBearerSecret(request: Request, envName: string): boolean {
  const expected = process.env[envName];
  if (!expected || expected.length < 32) return false;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expectedDigest = createHmac("sha256", expected).update("wariba-secret").digest();
  const providedDigest = createHmac("sha256", provided).update("wariba-secret").digest();
  return timingSafeEqual(expectedDigest, providedDigest);
}
