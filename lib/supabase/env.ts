export function hasSupabasePublicEnv(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}

export function getSupabasePublicEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("Supabase public configuration is missing");
  }
  return { url, publishableKey };
}

export function getSupabaseSecretKey(): string {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Supabase server configuration is missing");
  return key;
}
