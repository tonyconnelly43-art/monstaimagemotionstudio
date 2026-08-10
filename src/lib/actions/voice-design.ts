"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEFAULT_VOICE_MODEL_ID } from "@/lib/fal/models";
import {
  VOICE_DESIGN_ENDPOINT,
  VOICE_DESIGN_SAVE_ENDPOINT,
  buildVoiceDesignInput,
  type VoiceDesignOutput,
  type VoiceDesignSaveOutput,
} from "@/lib/fal/adapters/elevenlabs";
import { runQueueToCompletion, explainFalError } from "@/lib/fal/queue";

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

export interface VoiceDesignPreviewResult {
  generatedVoiceId: string;
  audioUrl: string;
  durationSeconds: number;
}

export interface DesignVoiceResult {
  previews?: VoiceDesignPreviewResult[];
  error?: string;
}

/** Generates a few preview voice options from a text description — nothing is saved yet. */
export async function designVoiceAction(prompt: string, sampleText?: string): Promise<DesignVoiceResult> {
  const trimmed = prompt.trim();
  if (trimmed.length < 20) {
    return { error: "Describe the voice in at least 20 characters so it has enough to work with." };
  }
  if (trimmed.length > 1000) {
    return { error: "That description is too long — keep it under 1000 characters." };
  }

  try {
    const input = buildVoiceDesignInput({ prompt: trimmed, sampleText });
    const result = await runQueueToCompletion<VoiceDesignOutput>(VOICE_DESIGN_ENDPOINT, input);
    return {
      previews: result.previews.map((p) => ({
        generatedVoiceId: p.generated_voice_id,
        audioUrl: p.audio.url,
        durationSeconds: p.duration_seconds,
      })),
    };
  } catch (err) {
    const { message } = explainFalError(err);
    return { error: message };
  }
}

export interface SaveDesignedVoiceResult {
  voiceId?: string;
  error?: string;
}

/** Permanently saves one previewed design as a real, reusable voice profile. */
export async function saveDesignedVoiceAction(
  generatedVoiceId: string,
  name: string,
  description: string,
  characterId: string | null,
): Promise<SaveDesignedVoiceResult> {
  if (!name.trim()) return { error: "Give the voice a name first." };

  const { supabase, user } = await requireUser();

  try {
    const result = await runQueueToCompletion<VoiceDesignSaveOutput>(VOICE_DESIGN_SAVE_ENDPOINT, {
      generated_voice_id: generatedVoiceId,
      voice_name: name.trim(),
      voice_description: description.trim() || name.trim(),
    });

    const { data, error } = await supabase
      .from("voices")
      .insert({
        user_id: user.id,
        character_id: characterId,
        name: name.trim(),
        provider: "fal",
        model_id: DEFAULT_VOICE_MODEL_ID,
        voice_id: result.voice_id,
        description: description.trim() || null,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Could not save the new voice.");

    revalidatePath("/voices");
    return { voiceId: data.id as string };
  } catch (err) {
    const { message } = explainFalError(err);
    return { error: message };
  }
}
