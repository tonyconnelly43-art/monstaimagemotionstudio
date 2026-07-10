import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";
import type { Database } from "@/types/database";

let cached: SupabaseClient<Database> | null = null;

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely — only
 * use it for trusted server-side operations that have already performed
 * their own ownership checks (e.g. writing a fal webhook result to the row
 * that owns a known `generation_jobs.id`). Never import this from a client
 * component and never forward its results without an ownership check.
 */
export function getServiceSupabaseClient(): SupabaseClient<Database> {
  if (cached) return cached;
  const env = getServerEnv();
  cached = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
