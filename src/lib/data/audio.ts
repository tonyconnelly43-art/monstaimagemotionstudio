import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;
export type AudioTrack = Database["public"]["Tables"]["audio_tracks"]["Row"];
export type DialogueLine = Database["public"]["Tables"]["dialogue_lines"]["Row"];
export type Voice = Database["public"]["Tables"]["voices"]["Row"];
export type VoiceSample = Database["public"]["Tables"]["voice_samples"]["Row"];

export async function listAudioTracks(supabase: Client, sceneId: string) {
  const { data, error } = await supabase
    .from("audio_tracks")
    .select("*")
    .eq("scene_id", sceneId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listDialogueLines(supabase: Client, sceneId: string) {
  const { data, error } = await supabase
    .from("dialogue_lines")
    .select("*")
    .eq("scene_id", sceneId)
    .order("line_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listVoices(supabase: Client) {
  const { data, error } = await supabase.from("voices").select("*").order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Rough speaking-duration estimate from word count and a words-per-minute speed. */
export function estimateSpeechDurationMs(text: string, wordsPerMinute = 150): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  return Math.round((words / wordsPerMinute) * 60 * 1000);
}
