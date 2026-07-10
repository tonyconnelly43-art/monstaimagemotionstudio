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

export async function createHoopSquadSceneAction(name: string, category: string) {
  const { supabase, user } = await requireUser();
  const { data, error } = await supabase
    .from("hoop_squad_scenes")
    .insert({ user_id: user.id, name, category, is_placeholder: true })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create location.");
  revalidatePath("/hoop-squad");
  return data.id as string;
}

export async function updateHoopSquadSceneAction(
  id: string,
  patch: Partial<Database["public"]["Tables"]["hoop_squad_scenes"]["Update"]>,
) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("hoop_squad_scenes").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/hoop-squad");
  revalidatePath(`/hoop-squad/${id}`);
}

export async function deleteHoopSquadSceneAction(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("hoop_squad_scenes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/hoop-squad");
}

export async function deleteSceneReferenceAction(referenceId: string, hoopSquadSceneId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("scene_references").delete().eq("id", referenceId);
  if (error) throw new Error(error.message);
  revalidatePath(`/hoop-squad/${hoopSquadSceneId}`);
}

export interface SceneTemplateInput {
  name: string;
  hoopSquadSceneId: string | null;
  cameraAngle?: string;
  promptInstructions?: string;
}

export async function createSceneTemplateAction(input: SceneTemplateInput) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("scene_templates").insert({
    user_id: user.id,
    name: input.name,
    hoop_squad_scene_id: input.hoopSquadSceneId,
    camera_angle: input.cameraAngle,
    prompt_instructions: input.promptInstructions,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/hoop-squad");
}

export async function deleteSceneTemplateAction(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("scene_templates").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/hoop-squad");
}

export async function applySceneTemplateAction(templateId: string, sceneId: string, projectId: string) {
  const { supabase } = await requireUser();
  const { data: template, error } = await supabase.from("scene_templates").select("*").eq("id", templateId).single();
  if (error || !template) throw new Error("Template not found.");

  const { error: updateError } = await supabase
    .from("scenes")
    .update({
      hoop_squad_scene_id: template.hoop_squad_scene_id,
      camera_angle: template.camera_angle,
      character_ids: template.character_ids,
      aspect_ratio: template.aspect_ratio ?? undefined,
    })
    .eq("id", sceneId);
  if (updateError) throw new Error(updateError.message);
  revalidatePath(`/studio/${projectId}`);
}
