import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;
export type Project = Database["public"]["Tables"]["projects"]["Row"];

export const PROJECT_TYPES: { value: Project["project_type"]; label: string }[] = [
  { value: "character_introduction", label: "Character Introduction" },
  { value: "basketball_action", label: "Basketball Action" },
  { value: "dialogue_scene", label: "Dialogue Scene" },
  { value: "social_media_post", label: "Social Media Post" },
  { value: "cinematic_scene", label: "Cinematic Scene" },
  { value: "motion_comic", label: "Motion Comic" },
  { value: "story_episode", label: "Story Episode" },
  { value: "logo_title_animation", label: "Logo or Title Animation" },
  { value: "custom", label: "Custom" },
];

export async function listProjects(supabase: Client, opts?: { status?: Project["status"] }) {
  let query = supabase.from("projects").select("*").order("updated_at", { ascending: false });
  query = query.eq("status", opts?.status ?? "active");
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getProject(supabase: Client, id: string) {
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}
