"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getVoiceModel, DEFAULT_VOICE_MODEL_ID } from "@/lib/fal/models";
import { buildElevenLabsInput, type ElevenLabsOutput } from "@/lib/fal/adapters/elevenlabs";
import { runQueueToCompletion, explainFalError } from "@/lib/fal/queue";
import type { Database } from "@/types/database";

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

export async function createVoiceAction(name: string) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("voices")
    .insert({ user_id: user.id, name, provider: "fal", model_id: DEFAULT_VOICE_MODEL_ID })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create voice.");
  revalidatePath("/voices");
  return data.id as string;
}

export async function updateVoiceAction(
  voiceId: string,
  patch: Partial<Database["public"]["Tables"]["voices"]["Update"]>,
) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("voices").update(patch).eq("id", voiceId);
  if (error) throw new Error(error.message);
  revalidatePath("/voices");
}

export async function deleteVoiceAction(voiceId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("voices").delete().eq("id", voiceId);
  if (error) throw new Error(error.message);
  revalidatePath("/voices");
}

/**
 * Assigns a voice to a character from the character's own page — clears any
 * other voice currently pointing at this character first, so generation
 * (which looks up a character's voice by character_id) never finds more
 * than one match.
 */
export async function assignCharacterVoiceAction(characterId: string, voiceId: string | null) {
  const { supabase } = await requireUser();
  const { error: clearError } = await supabase.from("voices").update({ character_id: null }).eq("character_id", characterId);
  if (clearError) throw new Error(clearError.message);
  if (voiceId) {
    const { error } = await supabase.from("voices").update({ character_id: characterId }).eq("id", voiceId);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/voices");
  revalidatePath(`/characters/${characterId}`);
}

export async function confirmVoiceCloneConsentAction(voiceId: string, referenceAudioUrl: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("voices")
    .update({
      is_cloned: true,
      reference_audio_url: referenceAudioUrl,
      consent_confirmed: true,
      consent_confirmed_at: new Date().toISOString(),
    })
    .eq("id", voiceId);
  if (error) throw new Error(error.message);
  revalidatePath("/voices");
}

export interface VoicePreviewResult {
  audioUrl?: string;
  error?: string;
}

/**
 * Generates a short preview using the wired ElevenLabs-via-fal model.
 * Blocks for up to ~45s since TTS is fast — video generation uses the async
 * queue+poll route instead.
 */
export async function generateVoicePreviewAction(voiceId: string, sampleText: string): Promise<VoicePreviewResult> {
  if (!sampleText.trim()) return { error: "Enter some sample text first." };

  const { supabase, user } = await requireUser();
  const { data: voice } = await supabase.from("voices").select("*").eq("id", voiceId).maybeSingle();
  if (!voice) return { error: "Voice not found." };

  const modelId = voice.model_id ?? DEFAULT_VOICE_MODEL_ID;
  const model = getVoiceModel(modelId);
  if (!model || !model.isWired) {
    return {
      error: `${model?.displayName ?? modelId} isn't wired for generation yet. Use ElevenLabs Eleven v3 for now.`,
    };
  }
  if (voice.is_cloned) {
    return {
      error: "This is a cloned voice profile. Voice-cloning generation (F5-TTS/Qwen) isn't wired yet — see Settings.",
    };
  }

  try {
    const input = buildElevenLabsInput({ modelId, text: sampleText, voice: voice.voice_id ?? undefined });
    const result = await runQueueToCompletion<ElevenLabsOutput>(model.falEndpointId, input);

    await supabase.from("voice_samples").insert({
      user_id: user.id,
      voice_id: voiceId,
      sample_text: sampleText,
      audio_url: result.audio.url,
    });
    revalidatePath("/voices");
    return { audioUrl: result.audio.url };
  } catch (err) {
    const { message } = explainFalError(err);
    return { error: message };
  }
}
