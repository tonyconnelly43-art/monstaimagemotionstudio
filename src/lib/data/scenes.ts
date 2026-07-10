import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;
export type Scene = Database["public"]["Tables"]["scenes"]["Row"];
export type UploadedAsset = Database["public"]["Tables"]["uploaded_assets"]["Row"];
export type GenerationTake = Database["public"]["Tables"]["generation_takes"]["Row"];
export type GenerationJob = Database["public"]["Tables"]["generation_jobs"]["Row"];

export async function listScenes(supabase: Client, projectId: string) {
  const { data, error } = await supabase
    .from("scenes")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listAllScenesForUser(supabase: Client) {
  const { data, error } = await supabase.from("scenes").select("*").order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getScene(supabase: Client, sceneId: string) {
  const { data, error } = await supabase.from("scenes").select("*").eq("id", sceneId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listSceneAssets(supabase: Client, sceneId: string) {
  const { data, error } = await supabase
    .from("uploaded_assets")
    .select("*")
    .eq("scene_id", sceneId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listSceneTakes(supabase: Client, sceneId: string) {
  const { data, error } = await supabase
    .from("generation_takes")
    .select("*")
    .eq("scene_id", sceneId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export const ASSET_ROLES: { value: UploadedAsset["role"]; label: string }[] = [
  { value: "main_starting_frame", label: "Main Starting Frame" },
  { value: "ending_frame", label: "Ending Frame" },
  { value: "character_reference", label: "Character Reference" },
  { value: "background_reference", label: "Background Reference" },
  { value: "pose_reference", label: "Pose Reference" },
  { value: "style_reference", label: "Style Reference" },
  { value: "prop_reference", label: "Prop Reference" },
  { value: "motion_reference", label: "Motion Reference" },
  { value: "reference_video", label: "Reference Video" },
];
