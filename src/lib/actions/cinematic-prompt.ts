"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { callClaude } from "@/lib/anthropic/client";
import { listDialogueLines } from "@/lib/data/audio";

const SYSTEM_PROMPT = `You are a professional cinematography assistant that writes precise, timestamped, multi-shot prompts for an AI video generation model (Seedance 2.0). Your output is sent directly to the video model as its prompt, so it must be literal and unambiguous — describe exactly what the camera sees and what happens, shot by shot. Never address the reader; output only the shot list itself.

Format, exactly:
- Break the full duration into consecutive shots whose times sum to exactly the total duration given. Most shots run 2-5 seconds.
- Each shot is one line: [MM:SS - MM:SS] Shot size, focal length, camera angle, camera movement — flat 2D cartoon: subject and action description. If that shot has a speaking line, end it with the line in quotes.
- Shot size: Wide, Medium, or Close-up. Focal length: 24mm for wide establishing shots, 50mm for medium/natural shots, 85mm for close-ups. Camera angle: eye-level, high angle, or low angle. Camera movement: static, push in, pull out, pan left, pan right, tilt up, tilt down, or tracking.
- Preserve every character's established design, uniform, jersey number, and the environment exactly as described in the input — never redesign or restyle anything between shots.
- Never invent characters, logos, on-screen text, or objects that aren't in the input.
- Keep the whole output well under 1500 characters — be economical with words.
- Output only the shot list, one shot per line, nothing else.`;

export interface WriteCinematicPromptResult {
  prompt?: string;
  error?: string;
}

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

export async function writeCinematicPromptAction(
  sceneId: string,
  projectId: string,
  sceneIdea: string,
): Promise<WriteCinematicPromptResult> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return { error: "Add ANTHROPIC_API_KEY in your environment variables first (Settings shows connection status)." };
    }
    const { supabase, user } = await requireUser();

    const { data: scene, error: sceneError } = await supabase.from("scenes").select("*").eq("id", sceneId).single();
    if (sceneError || !scene) return { error: "Scene not found." };

    const [{ data: characters }, { data: location }, dialogueLines, { data: settings }] = await Promise.all([
      scene.character_ids?.length
        ? supabase
            .from("characters")
            .select("id, name, description, jersey_number, approved_color_palette")
            .in("id", scene.character_ids)
        : Promise.resolve({ data: [] }),
      scene.hoop_squad_scene_id
        ? supabase
            .from("hoop_squad_scenes")
            .select("name, environment_description")
            .eq("id", scene.hoop_squad_scene_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      listDialogueLines(supabase, sceneId),
      supabase
        .from("app_settings")
        .select("hoop_squad_style_instructions, basketball_style_instructions, everyday_style_instructions")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    const styleForMode =
      scene.style_mode === "basketball" ? settings?.basketball_style_instructions : settings?.everyday_style_instructions;

    const characterLines = (characters ?? [])
      .map((c) => {
        const details = [
          c.description,
          c.jersey_number ? `jersey #${c.jersey_number}` : null,
          c.approved_color_palette ? `colors: ${c.approved_color_palette}` : null,
        ]
          .filter(Boolean)
          .join(", ");
        return details ? `${c.name} (${details})` : c.name;
      })
      .join("; ");

    const dialogueText = dialogueLines
      .map((d) => {
        const speaker = (characters ?? []).find((c) => c.id === d.speaker_character_id)?.name ?? "Narrator";
        const notes = [d.emotion, d.performance_note].filter(Boolean).join(", ");
        return `${speaker}: "${d.text_content}"${notes ? ` (${notes})` : ""}`;
      })
      .join(" | ");

    const userPrompt = `Total clip duration: ${scene.duration_seconds} seconds.
Animation style: ${settings?.hoop_squad_style_instructions ?? ""} ${styleForMode ?? ""}
Characters in this shot: ${characterLines || "none specified"}.
Location: ${location?.name ?? "unspecified"} — ${location?.environment_description ?? ""}
Dialogue in order: ${dialogueText || "none"}
Scene idea: ${sceneIdea}

Write the shot list now.`;

    const { text } = await callClaude(SYSTEM_PROMPT, userPrompt);
    if (!text.trim()) return { error: "Claude returned an empty response. Try again." };

    const { error: updateError } = await supabase.from("scenes").update({ ai_written_prompt: text.trim() }).eq("id", sceneId);
    if (updateError) return { error: updateError.message };

    revalidatePath(`/studio/${projectId}`);
    revalidatePath("/prompt-builder");
    return { prompt: text.trim() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not write the prompt." };
  }
}

export async function updateAiWrittenPromptAction(sceneId: string, projectId: string, text: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("scenes").update({ ai_written_prompt: text }).eq("id", sceneId);
  if (error) throw new Error(error.message);
  revalidatePath(`/studio/${projectId}`);
  revalidatePath("/prompt-builder");
}

export async function setPromptSourceAction(sceneId: string, projectId: string, source: "guided" | "ai_written") {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("scenes").update({ prompt_source: source }).eq("id", sceneId);
  if (error) throw new Error(error.message);
  revalidatePath(`/studio/${projectId}`);
  revalidatePath("/prompt-builder");
}
