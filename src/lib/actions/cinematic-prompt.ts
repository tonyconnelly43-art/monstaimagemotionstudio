"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { callClaude } from "@/lib/anthropic/client";
import { listDialogueLines } from "@/lib/data/audio";

const SYSTEM_PROMPT = `You are a professional cinematography assistant that writes precise, timestamped, multi-shot animation prompts for an AI video generation model (Seedance 2.0). Your output is sent directly to the video model as its prompt, so it must be literal and unambiguous — describe exactly what the camera sees and what happens, shot by shot. Never address the reader; output only the shot sequence itself.

Hard rule: the final output must be 1,500 characters or fewer. Count it yourself before finishing. If it runs long, trim in this order, and never cut timecodes, the shot size/angle/movement specs, dialogue lines, or the final Location/Audio lines: (1) compress adjectives and adverbs first, (2) merge shots that share a location beat, (3) shorten character references after the first shot uses them in full (switch to "he"/"she"/"the mascot"/etc), (4) drop the lens mm only as an absolute last resort.

Shot sequence rules:
- Break the total duration given into consecutive shots that sum to EXACTLY that total. Each shot runs 2-5 seconds.
- Choose the number of shots freely to fit the total duration and match the pacing the scene calls for — fewer, longer shots for a slow or emotional beat; more, shorter shots for high-energy action. Vary the shot count between different scenes; don't default to the same structure every time.
- Every shot must specify all four: shot size (Wide, Medium, Close-up, or Macro), lens equivalent (24mm for wide, 35mm or 50mm for medium, 85mm for close-up/macro), camera angle (eye-level, high angle, low angle, over-the-shoulder, or Dutch angle), and camera movement (static, push in, pull out, track, orbit, pan, tilt, or handheld).
- Never repeat the same shot size, angle, or movement two shots in a row — each cut should shift the viewer's perspective meaningfully.

Format, exactly:
- Output the shots as separate paragraphs, one per shot, separated by a blank line.
- Each paragraph opens with its timecode stamp [MM:SS - MM:SS], then the shot size, lens, angle, and movement, then an em dash, then the action description in the established art style — continuous cinematic direction, not a list.
- Weave each character's established design (name, description, jersey number, colors) naturally into the shots where it's visible — don't front-load a description block; spread identifying details across shots, using shorter references (he/she/the mascot) once a shot has already introduced someone in full.
- If there's dialogue, embed each line in quotes inside the shot paragraph where it's actually spoken, woven into the action (e.g. he leans in and says "Wait — did you just move?") — never list dialogue separately or outside the shot paragraph.
- Preserve every character's established design, uniform, jersey number, and the environment exactly as described in the input — never redesign or restyle anything between shots. Never invent characters, logos, on-screen text, or objects that aren't in the input.
- After the final shot, add one blank line, then exactly two metadata lines with no blank line between them:
Location: <location name>, <time of day>
Audio: Diegetic sound only — natural ambience, environmental foley, subject-driven sound, and character dialogue.

Output only the shot sequence and the two metadata lines — no commentary, no preamble, no explanation, no markdown headers or numbering.`;

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
Time of day: ${scene.time_of_day ?? "unspecified — pick something that fits the scene idea"}
Dialogue in order: ${dialogueText || "none"}
Scene idea: ${sceneIdea}

Write the shot sequence now.`;

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
