"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getVideoModel, DEFAULT_VIDEO_MODEL_ID } from "@/lib/fal/models";
import { buildSeedanceInput } from "@/lib/fal/adapters/seedance";
import { submitToQueue, explainFalError } from "@/lib/fal/queue";
import { buildFinalPrompt, type CharacterForPrompt, type SceneLocationForPrompt } from "@/lib/prompt/build-prompt";
import { EMPTY_PROMPT_SECTIONS, DEFAULT_BASKETBALL_NEGATIVES, type PromptSections } from "@/lib/prompt/types";
import { estimateVideoCost } from "@/lib/pricing/config";
import { generationRequestSchema, GENERATION_RATE_LIMIT } from "@/lib/validation/generation";
import { ASSET_ROLES } from "@/lib/data/scenes";
import type { ConsistencyStrength } from "@/lib/fal/models";

export interface SubmitGenerationResult {
  jobId?: string;
  error?: string;
}

/**
 * A multi-character video generation's most common failure mode isn't a bad
 * pose or a wrong color — it's the model losing track of *who is who*
 * mid-clip: duplicating a character, or morphing one character's appearance
 * into another's during a hand-off (e.g. a pass). Character Lock Strength
 * previously only affected the Guided Builder's prompt text and did nothing
 * at all for AI Cinematic Script scenes. This runs for both prompt sources,
 * scaling its emphasis with the same strength setting the user already sees
 * in Studio.
 */
function characterIdentityGuard(characters: CharacterForPrompt[], strength: ConsistencyStrength | null): string {
  if (characters.length < 2) return "";
  const names = characters.map((c) => c.name).join(", ");
  const emphasis =
    strength === "maximum"
      ? "This is CRITICAL and must be followed with zero deviation: "
      : strength === "strong"
        ? "This is very important: "
        : "";
  return `${emphasis}There are exactly ${characters.length} named characters in this scene: ${names}. Keep each one visually distinct and consistent with their own established design for the entire clip — never duplicate a character into two copies of themselves, never let one character's face or body morph into another character's appearance during a hand-off or pass, and never invent extra unnamed characters beyond who's listed here.`;
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
  const characterLockImageUrls: string[] = [];
  if (scene.character_ids?.length) {
    const { data } = await supabase
      .from("characters")
      .select(
        "name, description, personality, jersey_number, approved_color_palette, negative_instructions, main_image_url, front_view_url, side_view_url, back_view_url",
      )
      .in("id", scene.character_ids);
    characters = data ?? [];
    // One canonical reference photo per locked character — this is what
    // actually makes Character Lock do anything for the video model (the
    // checkboxes previously only fed a text description into the Guided
    // Builder's prompt and had zero effect in AI Cinematic Script mode).
    // Only takes effect on a model with supportsReferenceToVideo (Seedance
    // 2 — Reference to Video); a single-image model has no slot for these.
    for (const c of data ?? []) {
      const photo = c.main_image_url ?? c.front_view_url ?? c.side_view_url ?? c.back_view_url;
      if (photo) characterLockImageUrls.push(photo);
    }
  }

  // A character's saved voice (assigned from the Voices page) as a reference
  // audio clip — otherwise Seedance's native audio generation invents a new
  // voice from scratch every single time, with zero consistency between
  // generations. Only meaningful on a model with supportsAudioReference
  // (currently Seedance 2 — Reference to Video).
  const characterVoiceAudioUrls: string[] = [];
  if (scene.character_ids?.length && model.capabilities.supportsAudioReference) {
    const { data: voices } = await supabase
      .from("voices")
      .select("id, reference_audio_url")
      .in("character_id", scene.character_ids);
    for (const voice of voices ?? []) {
      if (voice.reference_audio_url) {
        characterVoiceAudioUrls.push(voice.reference_audio_url);
        continue;
      }
      const { data: sample } = await supabase
        .from("voice_samples")
        .select("audio_url")
        .eq("voice_id", voice.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sample?.audio_url) characterVoiceAudioUrls.push(sample.audio_url);
    }
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

  let prompt: string;
  let negativePrompt: string;
  if (scene.prompt_source === "ai_written" && scene.ai_written_prompt?.trim()) {
    // The AI Cinematic Prompt writer already produces a complete, self-contained
    // shot list (style, characters, and location are all folded in when it's
    // written) — the guided builder's template assembly would be redundant here.
    prompt = scene.ai_written_prompt.trim();
    const hoopTarget = (scene.hoop_target as Record<string, string>) ?? {};
    // The Guided Builder path adds these automatically via buildFinalPrompt;
    // AI Cinematic Script scenes were silently skipping them entirely, even
    // though "no shooting toward the wrong basket" and "no duplicate players"
    // are exactly the failure modes basketball action scenes hit most.
    const basketballNegatives = Object.values(hoopTarget).some(Boolean) ? DEFAULT_BASKETBALL_NEGATIVES.join(", ") + "." : "";
    negativePrompt = [settings?.global_negative_prompt, basketballNegatives].filter(Boolean).join(" ");
  } else {
    const sections = (scene.prompt_sections as unknown as PromptSections) ?? EMPTY_PROMPT_SECTIONS;
    ({ prompt, negativePrompt } = buildFinalPrompt({
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
    }));
  }

  if (scene.character_lock) {
    const guard = characterIdentityGuard(characters, scene.character_lock_strength);
    if (guard) prompt = `${prompt}\n\n${guard}`;
  }

  if (!prompt.trim()) {
    return { error: "Add a description of the action before generating (Prompt Builder or the casual idea box)." };
  }

  const falInput = buildSeedanceInput({
    modelId,
    prompt: `${prompt}\n\nAvoid: ${negativePrompt}`,
    imageUrl: mainFrame ?? undefined,
    endImageUrl: endFrame ?? undefined,
    // Character Lock photos first so they survive the model's reference-image
    // cap even in scenes with several of the scene's own uploaded references.
    referenceImageUrls: [...characterLockImageUrls, ...referenceUrls],
    referenceVideoUrls,
    referenceAudioUrls: characterVoiceAudioUrls,
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
