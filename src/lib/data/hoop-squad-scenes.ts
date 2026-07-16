import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;
export type HoopSquadScene = Database["public"]["Tables"]["hoop_squad_scenes"]["Row"];
export type SceneReference = Database["public"]["Tables"]["scene_references"]["Row"];

export const SCENE_CATEGORIES: { value: HoopSquadScene["category"]; label: string }[] = [
  { value: "main_rec_center_gym", label: "Main Rec Center Gym" },
  { value: "basketball_court", label: "Basketball Court" },
  { value: "gym_bleachers", label: "Gym Bleachers" },
  { value: "team_bench", label: "Team Bench" },
  { value: "locker_room", label: "Locker Room" },
  { value: "coachs_office", label: "Coach's Office" },
  { value: "rec_center_hallway", label: "Rec Center Hallway" },
  { value: "trophy_case_area", label: "Trophy Case Area" },
  { value: "snack_bar", label: "Snack Bar" },
  { value: "rec_center_entrance", label: "Rec Center Entrance" },
  { value: "outdoor_basketball_court", label: "Outdoor Basketball Court" },
  { value: "neighborhood_street", label: "Neighborhood Street" },
  { value: "school", label: "School" },
  { value: "classroom", label: "Classroom" },
  { value: "playground", label: "Playground" },
  { value: "character_bedrooms", label: "Character Bedrooms" },
  { value: "character_homes", label: "Character Homes" },
  { value: "tournament_gym", label: "Tournament Gym" },
  { value: "championship_court", label: "Championship Court" },
  { value: "custom", label: "Custom Location" },
];

export const SCENE_VIEW_FIELDS: { field: keyof HoopSquadScene; label: string }[] = [
  { field: "main_image_url", label: "Main Environment Image" },
  { field: "wide_establishing_url", label: "Wide Establishing View" },
  { field: "left_side_view_url", label: "Left-Side View" },
  { field: "right_side_view_url", label: "Right-Side View" },
  { field: "close_up_background_url", label: "Close-Up Background" },
  { field: "entrance_view_url", label: "Entrance / Doorway View" },
  { field: "daytime_version_url", label: "Daytime Version" },
  { field: "evening_version_url", label: "Evening Version" },
  { field: "empty_version_url", label: "Empty Version (No Characters)" },
];

export async function listHoopSquadScenes(supabase: Client) {
  const { data, error } = await supabase.from("hoop_squad_scenes").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getHoopSquadScene(supabase: Client, id: string) {
  const { data, error } = await supabase.from("hoop_squad_scenes").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listSceneReferences(supabase: Client, hoopSquadSceneId: string) {
  const { data, error } = await supabase
    .from("scene_references")
    .select("*")
    .eq("hoop_squad_scene_id", hoopSquadSceneId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** All view references for every saved location owned by the current user, for the Studio "pull from library" picker. */
export async function listAllSceneReferences(supabase: Client) {
  const { data, error } = await supabase.from("scene_references").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type SceneTemplate = Database["public"]["Tables"]["scene_templates"]["Row"];

export async function listSceneTemplates(supabase: Client) {
  const { data, error } = await supabase.from("scene_templates").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
