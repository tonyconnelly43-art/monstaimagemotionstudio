"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getVoiceModel, DEFAULT_VOICE_MODEL_ID } from "@/lib/fal/models";
import { buildElevenLabsInput, type ElevenLabsOutput } from "@/lib/fal/adapters/elevenlabs";
import { runQueueToCompletion, explainFalError } from "@/lib/fal/queue";
import { estimateSpeechDurationMs } from "@/lib/data/audio";
import type { Database } from "@/types/database";

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

export async function createDialogueLineAction(sceneId: string, projectId: string) {
  const { supabase, user } = await requireUser();
  const { count } = await supabase
    .from("dialogue_lines")
    .select("id", { count: "exact", head: true })
    .eq("scene_id", sceneId);
  const { error } = await supabase.from("dialogue_lines").insert({
    user_id: user.id,
    scene_id: sceneId,
    line_order: (count ?? 0) + 1,
    text_content: "",
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/audio`);
  revalidatePath(`/studio/${projectId}`);
}

export async function updateDialogueLineAction(
  lineId: string,
  patch: Partial<Database["public"]["Tables"]["dialogue_lines"]["Update"]>,
) {
  const { supabase } = await requireUser();
  if (typeof patch.text_content === "string") {
    patch.estimated_duration_ms = estimateSpeechDurationMs(patch.text_content);
  }
  const { error } = await supabase.from("dialogue_lines").update(patch).eq("id", lineId);
  if (error) throw new Error(error.message);
  revalidatePath("/audio");
}

export async function deleteDialogueLineAction(lineId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("dialogue_lines").delete().eq("id", lineId);
  if (error) throw new Error(error.message);
  revalidatePath("/audio");
}

export async function reorderDialogueLinesAction(orderedIds: string[]) {
  const { supabase } = await requireUser();
  await Promise.all(
    orderedIds.map((id, index) => supabase.from("dialogue_lines").update({ line_order: index + 1 }).eq("id", id)),
  );
  revalidatePath("/audio");
}

export interface GenerateLineResult {
  audioUrl?: string;
  error?: string;
}

/** Generates (or regenerates) audio for a single dialogue line without touching the others. */
export async function generateDialogueLineAudioAction(lineId: string): Promise<GenerateLineResult> {
  const { supabase } = await requireUser();
  const { data: line } = await supabase.from("dialogue_lines").select("*").eq("id", lineId).maybeSingle();
  if (!line) return { error: "Line not found." };
  if (!line.text_content.trim()) return { error: "This line has no text yet." };

  let voiceId: string | undefined;
  if (line.speaker_character_id) {
    const { data: voice } = await supabase
      .from("voices")
      .select("voice_id")
      .eq("character_id", line.speaker_character_id)
      .limit(1)
      .maybeSingle();
    voiceId = voice?.voice_id ?? undefined;
  }

  const model = getVoiceModel(DEFAULT_VOICE_MODEL_ID)!;
  const text = line.performance_note ? `[${line.performance_note}] ${line.text_content}` : line.text_content;

  try {
    const input = buildElevenLabsInput({ modelId: model.id, text, voice: voiceId });
    const result = await runQueueToCompletion<ElevenLabsOutput>(model.falEndpointId, input);
    await supabase.from("dialogue_lines").update({ audio_url: result.audio.url }).eq("id", lineId);
    revalidatePath("/audio");
    return { audioUrl: result.audio.url };
  } catch (err) {
    const { message } = explainFalError(err);
    return { error: message };
  }
}

/** Generates every dialogue line in a scene as one pass (still one fal call per line). */
export async function generateAllDialogueLinesAction(sceneId: string): Promise<{ generated: number; errors: string[] }> {
  const { supabase } = await requireUser();
  const { data: lines } = await supabase.from("dialogue_lines").select("id").eq("scene_id", sceneId);
  let generated = 0;
  const errors: string[] = [];
  for (const line of lines ?? []) {
    const result = await generateDialogueLineAudioAction(line.id);
    if (result.error) errors.push(result.error);
    else generated += 1;
  }
  return { generated, errors };
}
