"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { mixVideoWithAudioTracks } from "@/lib/ffmpeg/mix";

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

export interface BuildFinalCutResult {
  url?: string;
  error?: string;
}

/**
 * Server-side FFmpeg mux: combines the scene's selected take video with its
 * audio tracks (voiceover, music, SFX, ambience), applying per-track volume,
 * fades, mute/solo, and basic ducking of non-dialogue tracks under dialogue,
 * plus a master limiter. Uploads the result to the `exports` bucket and
 * returns a downloadable URL.
 */
export async function buildFinalCutAction(sceneId: string): Promise<BuildFinalCutResult> {
  const { supabase, user } = await requireUser();

  const { data: scene } = await supabase.from("scenes").select("*").eq("id", sceneId).maybeSingle();
  if (!scene) return { error: "Scene not found." };
  if (!scene.selected_take_id) return { error: "This scene doesn't have a selected take yet." };

  const { data: take } = await supabase.from("generation_takes").select("output_url").eq("id", scene.selected_take_id).maybeSingle();
  if (!take?.output_url) return { error: "The selected take has no video output." };

  const { data: tracks } = await supabase.from("audio_tracks").select("*").eq("scene_id", sceneId);
  const allTracks = tracks ?? [];
  const soloed = allTracks.filter((t) => t.is_solo);
  const activeTracks = (soloed.length > 0 ? soloed : allTracks).filter((t) => !t.is_muted);

  if (activeTracks.length === 0) {
    return { error: "Add at least one audio track (voiceover, music, or SFX) before building the final cut." };
  }

  try {
    const buffer = await mixVideoWithAudioTracks({
      videoUrl: take.output_url,
      tracks: activeTracks.map((t) => ({
        sourceUrl: t.source_url,
        startMs: t.start_ms,
        trimStartMs: t.trim_start_ms,
        trimEndMs: t.trim_end_ms,
        volumeDb: t.volume_db,
        fadeInMs: t.fade_in_ms,
        fadeOutMs: t.fade_out_ms,
        isMuted: t.is_muted,
        isDialogueTrack: t.track_type === "voiceover_generated" || t.track_type === "voiceover_uploaded",
        duckUnderDialogue: t.duck_under_dialogue,
      })),
    });

    const path = `${user.id}/${scene.project_id}/${scene.id}/final-cut-${Date.now()}.mp4`;
    const { error: uploadError } = await supabase.storage
      .from("exports")
      .upload(path, buffer, { contentType: "video/mp4", upsert: true });
    if (uploadError) return { error: `Rendered, but could not save the export: ${uploadError.message}` };

    const { data: publicUrl } = supabase.storage.from("exports").getPublicUrl(path);
    return { url: publicUrl.publicUrl };
  } catch (err) {
    return {
      error:
        err instanceof Error
          ? `FFmpeg could not build the final cut: ${err.message}`
          : "FFmpeg could not build the final cut.",
    };
  }
}
