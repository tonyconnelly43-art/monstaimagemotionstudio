import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export type AppSettings = Database["public"]["Tables"]["app_settings"]["Row"];

export async function getAppSettings(supabase: SupabaseClient<Database>, userId: string): Promise<AppSettings | null> {
  const { data, error } = await supabase.from("app_settings").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}
