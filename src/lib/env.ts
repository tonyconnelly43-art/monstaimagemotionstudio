import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  FAL_KEY: z.string().min(1, "FAL_KEY is required"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "SUPABASE_SERVICE_ROLE_KEY is required"),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

/**
 * Validates required server-only environment variables. Call this from
 * server actions / route handlers before using fal or the Supabase service
 * role client, so a missing key fails fast with a clear message instead of
 * an opaque downstream error.
 */
export function getServerEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse({
    FAL_KEY: process.env.FAL_KEY,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid/missing environment variables: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export function isFalConfigured(): boolean {
  return Boolean(process.env.FAL_KEY);
}

/** Optional — only needed for the AI Cinematic Prompt writer, not required for the rest of the app. */
export function isAnthropicConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * The website's leads live in a Neon Postgres database. Normally that's a
 * separate database from this app's own Supabase instance, reached via the
 * explicit WEBSITE_LEADS_DATABASE_URL override — but if this Vercel project
 * has that same Neon database connected directly (Storage tab), Vercel
 * already injects it as DATABASE_URL, so fall back to that.
 */
export function getWebsiteLeadsDatabaseUrl(): string | undefined {
  return process.env.WEBSITE_LEADS_DATABASE_URL || process.env.DATABASE_URL;
}

/** Optional — only needed for the Leads page, which reads the marketing site's own Neon database. */
export function isWebsiteLeadsConfigured(): boolean {
  return Boolean(getWebsiteLeadsDatabaseUrl());
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
