"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getFalClient } from "@/lib/fal/client";
import { getQueueStatus } from "@/lib/fal/queue";
import { DEFAULT_VIDEO_MODEL_ID, getVideoModel } from "@/lib/fal/models";
import { isFalConfigured, isSupabaseConfigured, isAnthropicConfigured, isWebsiteLeadsConfigured } from "@/lib/env";
import { callClaude } from "@/lib/anthropic/client";
import { neon } from "@neondatabase/serverless";
import type { Database } from "@/types/database";

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

export async function updateSettingsAction(
  patch: Partial<Database["public"]["Tables"]["app_settings"]["Update"]>,
) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("app_settings").update(patch).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}

export interface ConnectionTestResult {
  ok: boolean;
  message: string;
}

export async function testFalConnectionAction(): Promise<ConnectionTestResult> {
  if (!isFalConfigured()) {
    return { ok: false, message: "FAL_KEY is not set in this environment." };
  }
  try {
    getFalClient();
    const model = getVideoModel(DEFAULT_VIDEO_MODEL_ID)!;
    // A random request id will not exist — a 404-style "not found" response
    // still proves the API key authenticated successfully.
    await getQueueStatus(model.falEndpointId, "00000000-0000-0000-0000-000000000000");
    return { ok: true, message: "fal.ai responded — connection looks good." };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/not found|404/i.test(message)) {
      return { ok: true, message: "fal.ai authenticated successfully (test request correctly not found)." };
    }
    if (/401|unauthorized|invalid key/i.test(message)) {
      return { ok: false, message: "fal.ai rejected the API key. Check FAL_KEY." };
    }
    return { ok: false, message: `Could not reach fal.ai: ${message}` };
  }
}

export async function testSupabaseConnectionAction(): Promise<ConnectionTestResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: "Supabase environment variables are not fully set." };
  }
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.from("app_settings").select("user_id").limit(1);
    if (error) return { ok: false, message: `Supabase query failed: ${error.message}` };
    return { ok: true, message: "Supabase connection and Row Level Security check passed." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not reach Supabase." };
  }
}

export async function testAnthropicConnectionAction(): Promise<ConnectionTestResult> {
  if (!isAnthropicConfigured()) {
    return { ok: false, message: "ANTHROPIC_API_KEY is not set in this environment." };
  }
  try {
    const { text } = await callClaude("Reply with exactly one word: OK", "Reply with exactly one word.", 10);
    return { ok: true, message: text.trim() ? "Claude API responded — connection looks good." : "Claude responded with an empty message." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not reach the Claude API." };
  }
}

export async function testWebsiteLeadsConnectionAction(): Promise<ConnectionTestResult> {
  if (!isWebsiteLeadsConfigured()) {
    return { ok: false, message: "WEBSITE_LEADS_DATABASE_URL is not set in this environment." };
  }
  try {
    const sql = neon(process.env.WEBSITE_LEADS_DATABASE_URL!);
    await sql`SELECT 1`;
    return { ok: true, message: "Connected to the website's leads database." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not reach the website's leads database." };
  }
}
