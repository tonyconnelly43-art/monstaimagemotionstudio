import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;
export type CharacterRow = Database["public"]["Tables"]["characters"]["Row"];
export type CharacterReference = Database["public"]["Tables"]["character_references"]["Row"];

export const PRECONFIGURED_SLOTS: { key: string; name: string }[] = [
  { key: "g", name: "G" },
  { key: "zo", name: "Zo" },
  { key: "zach", name: "Zach" },
  { key: "dash", name: "Dash" },
  { key: "fifth", name: "Fifth Hoop Squad Player" },
  { key: "coach", name: "Coach" },
];

export const CHARACTER_REFERENCE_TYPES: { value: CharacterReference["reference_type"]; label: string }[] = [
  { value: "pose", label: "Alternate Pose" },
  { value: "facial_expression", label: "Facial Expression" },
  { value: "uniform", label: "Uniform" },
  { value: "prop", label: "Prop" },
  { value: "style", label: "Style" },
  { value: "motion", label: "Motion" },
  { value: "other", label: "Other" },
];

export async function listCharacters(supabase: Client) {
  const { data, error } = await supabase.from("characters").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getCharacter(supabase: Client, id: string) {
  const { data, error } = await supabase.from("characters").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listCharacterReferences(supabase: Client, characterId: string) {
  const { data, error } = await supabase
    .from("character_references")
    .select("*")
    .eq("character_id", characterId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** All reference images for every character owned by the current user, for the Studio "pull from library" picker. */
export async function listAllCharacterReferences(supabase: Client) {
  const { data, error } = await supabase.from("character_references").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
