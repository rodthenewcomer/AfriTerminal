import { createClient, type User } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { getSupabasePublicEnv } from "./env";

export class ApiAuthError extends Error {
  constructor(public readonly status: 401 | 503, message: string) {
    super(message);
  }
}

function bearerToken(request: Request): string {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new ApiAuthError(401, "Authentification requise");
  }
  return authorization.slice(7).trim();
}

export async function requireApiUser(request: Request) {
  let env: ReturnType<typeof getSupabasePublicEnv>;
  try {
    env = getSupabasePublicEnv();
  } catch {
    throw new ApiAuthError(503, "Service de compte non configuré");
  }
  const token = bearerToken(request);
  const client = createClient(env.url, env.publishableKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new ApiAuthError(401, "Session invalide ou expirée");
  return { client, user: data.user as User };
}

export function apiError(error: unknown): NextResponse {
  if (error instanceof ApiAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("API request failed", error);
  return NextResponse.json({ error: "Le service est momentanément indisponible." }, { status: 500 });
}
