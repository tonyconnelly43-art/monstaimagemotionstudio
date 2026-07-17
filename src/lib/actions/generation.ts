"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getVideoModel, DEFAULT_VIDEO_MODEL_ID } from "@/lib/fal/models";
import { buildSeedanceInput } from "@/lib/fal/adapters/seedance";
import { submitToQueue, explainFalError } from "@/lib/fal/queue";
import { buildFinalPrompt, type CharacterForPrompt, type SceneLocationForPrompt } from "@/lib/prompt/build-prompt";
import { EMPTY_PROMPT_SECTIONS, type PromptSections } from "@/lib/prompt/types";
import { estimateVideoCost } from "@/lib/pricing/config";
import { generationRequestSchema, GENERATION_RATE_LIMIT } from "@/lib/validation/generation";
import { ASSET_ROLES } from "@/lib/data/scenes";

export interface SubmitGenerationResult {
  jobId?: string;
  error?: string;
}

export async function submitGenerationAction(sceneIdInput: string): Promise<SubmitGenerationResult> {
  const parsed = generationRequestSchema.safeParse({ sceneId: sceneIdInput });
  if (!parsed.success) return { error: "Invalid scene." };
  const { sceneId } = parsed.data;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  // Rate limit: cap generation requests per user per rolling window.
  const windowStart = new Date(Date.now() - GENERATION_RATE_LIMIT.windowMs).toISOString();
  const { count: recentCount } = await supabase
    .from("generation_jobs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", windowStart);
  if ((recentCount ?? 0) >= GENERATION_RATE_LIMIT.maxRequests) {
    return { error: "You've hit the generation rate limit for this hour. Please try again later." };
  }

  const { data: scene, error: sceneError } = await supabase.from("scenes").select("*").eq("id", sceneId).single();
  if (sceneError || !scene) return { error: "Scene not found." };

  const modelId = scene.video_model_id ?? DEFAULT_VIDEO_MODEL_ID;
  const model = getVideoModel(modelId);
  if (!model) return { error: "Selected video model is not available." };

  const { data: assets } = await supabase
    .from("uploaded_assets")
    .select("*")
    .eq("scene_id", sceneId)
    .order("created_at", { ascending: true });
  const byRole = (role: string) => (assets ?? []).filter((a) => a.role === role);
  // Most recently added wins when more than one is tagged the same role (e.g. a
  // freshly AI-composed starting frame replacing an older upload).
  const mainFrame = byRole("main_starting_frame").at(-1)?.public_url;
  const endFrame = byRole("ending_frame").at(-1)?.public_url;
  const referenceUrls = (assets ?? [])
    .filter((a) => !["main_starting_frame", "ending_frame", "reference_video"].includes(a.role) && a.public_url)
    .map((a) => a.public_url!) as string[];
  const referenceVideoUrls = byRole("reference_video")
    .map((a) => a.public_url)
    .filter((u): u is string => Boolean(u));

  if (model.capabilities.supportsImageToVideo && !model.capabilities.supportsReferenceToVideo && !mainFrame) {
    return {
      error: `${model.displayName} needs a Main Starting Frame image. Upload one and tag it as "${
        ASSET_ROLES.find((r) => r.value === "main_starting_frame")?.label
      }".`,
    };
  }

  let characters: CharacterForPrompt[] = [];
  if (scene.character_ids?.length) {
    const { data } = await supabase
      .from("characters")
      .select("name, description, personality, jersey_number, approved_color_palette, negative_instructions")
      .in("id", scene.character_ids);
    characters = data ?? [];
  }

  let location: SceneLocationForPrompt | null = null;
  if (scene.hoop_squad_scene_id) {
    const { data } = await supabase
      .from("hoop_squad_scenes")
      .select("name, environment_description, required_objects, forbidden_objects, consistency_instructions, negative_instructions")
      .eq("id", scene.hoop_squad_scene_id)
      .maybeSingle();
    location = data ?? null;
  }

  const { data: settings } = await supabase.from("app_settings").select("*").eq("user_id", user.id).maybeSingle();

  const sections = (scene.prompt_sections as unknown as PromptSections) ?? EMPTY_PROMPT_SECTIONS;
  const { prompt, negativePrompt } = buildFinalPrompt({
    casualIdea: scene.casual_idea ?? "",
    sections: { ...EMPTY_PROMPT_SECTIONS, ...sections },
    characters,
    location,
    cameraAngle: scene.camera_angle,
    timeOfDay: scene.time_of_day,
    characterPlacements: scene.character_placements ? JSON.stringify(scene.character_placements) : null,
    basketball: (scene.hoop_target as Record<string, string>) ?? undefined,
    characterLock: scene.character_lock,
    characterLockStrength: scene.character_lock_strength,
    sceneLock: scene.scene_lock,
    sceneLockStrength: scene.scene_lock_strength,
    hoopSquadStyleInstructions:
      settings?.hoop_squad_style_instructions ?? "Preserve the exact approved Hoop Squad cartoon illustration style.",
    globalNegativePrompt: settings?.global_negative_prompt ?? "",
    sceneStyleMode: scene.style_mode,
    basketballStyleInstructions: settings?.basketball_style_instructions ?? "",
    everydayStyleInstructions: settings?.everyday_style_instructions ?? "",
  });

  if (!prompt.trim()) {
    return { error: "Add a description of the action before generating (Prompt Builder or the casual idea box)." };
  }

  const falInput = buildSeedanceInput({
    modelId,
    prompt: `${prompt}\n\nAvoid: ${negativePrompt}`,
    imageUrl: mainFrame ?? undefined,
    endImageUrl: endFrame ?? undefined,
    referenceImageUrls: referenceUrls,
    referenceVideoUrls,
    resolution: undefined,
    duration: scene.duration_seconds,
    aspectRatio: scene.aspect_ratio,
    generateAudio: true,
  });

  const cost = estimateVideoCost(modelId, scene.duration_seconds);

  const { data: job, error: jobError } = await supabase
    .from("generation_jobs")
    .insert({
      user_id: user.id,
      project_id: scene.project_id,
      scene_id: scene.id,
      job_type: "video",
      model_id: modelId,
      status: "queued",
      input_payload: { falInput, prompt, negativePrompt } as never,
      cost_estimate: cost.amountUsd,
      cost_estimate_is_exact: cost.isExact,
    })
    .select("id")
    .single();
  if (jobError || !job) return { error: jobError?.message ?? "Could not create generation job." };

  try {
    const { requestId } = await submitToQueue(model.falEndpointId, falInput);
    await supabase
      .from("generation_jobs")
      .update({ fal_request_id: requestId, status: "processing", started_at: new Date().toISOString() })
      .eq("id", job.id);
  } catch (err) {
    const { message, code } = explainFalError(err);
    await supabase.from("generation_jobs").update({ status: "failed", error_message: message, error_code: code }).eq("id", job.id);
    revalidatePath(`/studio/${scene.project_id}`);
    return { error: message };
  }

  revalidatePath(`/studio/${scene.project_id}`);
  return { jobId: job.id };
}
