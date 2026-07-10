"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getLipsyncModel } from "@/lib/fal/models";
import { submitToQueue, explainFalError } from "@/lib/fal/queue";

export type LipSyncMode = "none" | "basic_mouth_movement" | "dialogue_lip_sync" | "narration_only";

export interface SubmitLipSyncResult {
  jobId?: string;
  error?: string;
}

/**
 * Runs the selected take's video through the Sync Lipsync 2.0 model with a
 * chosen audio track. Optional post-production step — scenes with narration
 * or off-camera dialogue can skip this entirely (mode: "none").
 */
export async function submitLipSyncAction(
  sceneId: string,
  audioTrackId: string,
  mode: LipSyncMode,
): Promise<SubmitLipSyncResult> {
  if (mode === "none") return { error: "Lip Sync mode is set to None." };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { data: scene } = await supabase.from("scenes").select("*").eq("id", sceneId).maybeSingle();
  if (!scene?.selected_take_id) return { error: "This scene doesn't have a selected take yet." };

  const { data: take } = await supabase.from("generation_takes").select("output_url").eq("id", scene.selected_take_id).maybeSingle();
  if (!take?.output_url) return { error: "The selected take has no video output." };

  const { data: track } = await supabase.from("audio_tracks").select("source_url").eq("id", audioTrackId).maybeSingle();
  if (!track?.source_url) return { error: "Choose an audio track to sync to." };

  const model = getLipsyncModel("sync-lipsync-v2")!;

  const { data: job, error: jobError } = await supabase
    .from("generation_jobs")
    .insert({
      user_id: user.id,
      project_id: scene.project_id,
      scene_id: scene.id,
      job_type: "lipsync",
      model_id: model.id,
      status: "queued",
      input_payload: { video_url: take.output_url, audio_url: track.source_url, mode } as never,
    })
    .select("id")
    .single();
  if (jobError || !job) return { error: jobError?.message ?? "Could not create the lip-sync job." };

  try {
    const { requestId } = await submitToQueue(model.falEndpointId, {
      video_url: take.output_url,
      audio_url: track.source_url,
    });
    await supabase
      .from("generation_jobs")
      .update({ fal_request_id: requestId, status: "processing", started_at: new Date().toISOString() })
      .eq("id", job.id);
  } catch (err) {
    const { message, code } = explainFalError(err);
    await supabase.from("generation_jobs").update({ status: "failed", error_message: message, error_code: code }).eq("id", job.id);
    return { error: message };
  }

  return { jobId: job.id };
}
