"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

export async function updateAudioTrackAction(
  trackId: string,
  patch: Partial<Database["public"]["Tables"]["audio_tracks"]["Update"]>,
) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("audio_tracks").update(patch).eq("id", trackId);
  if (error) throw new Error(error.message);
  revalidatePath("/audio");
}

export async function deleteAudioTrackAction(trackId: string) {
  const { supabase } = await requireUser();
  const { data: track } = await supabase.from("audio_tracks").select("source_url").eq("id", trackId).maybeSingle();
  const { error } = await supabase.from("audio_tracks").delete().eq("id", trackId);
  if (error) throw new Error(error.message);
  void track;
  revalidatePath("/audio");
}

export async function duplicateAudioTrackAction(trackId: string) {
  const { supabase, user } = await requireUser();
  const { data: source, error } = await supabase.from("audio_tracks").select("*").eq("id", trackId).single();
  if (error || !source) throw new Error("Track not found.");
  const { id: _id, created_at: _ca, updated_at: _ua, ...rest } = source;
  const { error: insertError } = await supabase.from("audio_tracks").insert({ ...rest, user_id: user.id });
  if (insertError) throw new Error(insertError.message);
  revalidatePath("/audio");
}
