"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DEFAULT_VIDEO_MODEL_ID } from "@/lib/fal/models";
import type { Database } from "@/types/database";

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

export async function createSceneAction(projectId: string) {
  const { supabase, user } = await requireUser();
  const { count } = await supabase
    .from("scenes")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  const sceneNumber = (count ?? 0) + 1;

  const { data, error } = await supabase
    .from("scenes")
    .insert({
      user_id: user.id,
      project_id: projectId,
      scene_number: sceneNumber,
      name: `Scene ${sceneNumber}`,
      sort_order: sceneNumber,
      video_model_id: DEFAULT_VIDEO_MODEL_ID,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not create scene.");

  revalidatePath(`/studio/${projectId}`);
  return data.id as string;
}

export async function updateSceneAction(
  sceneId: string,
  projectId: string,
  patch: Partial<Database["public"]["Tables"]["scenes"]["Update"]>,
) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("scenes").update(patch).eq("id", sceneId);
  if (error) throw new Error(error.message);
  revalidatePath(`/studio/${projectId}`);
}

export async function duplicateSceneAction(sceneId: string, projectId: string) {
  const { supabase, user } = await requireUser();
  const { data: source, error } = await supabase.from("scenes").select("*").eq("id", sceneId).single();
  if (error || !source) throw new Error("Scene not found.");

  const { count } = await supabase
    .from("scenes")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId);
  const sceneNumber = (count ?? 0) + 1;

  const { id: _id, selected_take_id: _stid, created_at: _ca, updated_at: _ua, ...rest } = source;
  const { data, error: insertError } = await supabase
    .from("scenes")
    .insert({
      ...rest,
      user_id: user.id,
      project_id: projectId,
      scene_number: sceneNumber,
      name: `${source.name} (Copy)`,
      sort_order: sceneNumber,
    })
    .select("id")
    .single();
  if (insertError || !data) throw new Error(insertError?.message ?? "Could not duplicate scene.");

  revalidatePath(`/studio/${projectId}`);
  return data.id as string;
}

export async function deleteSceneAction(sceneId: string, projectId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("scenes").delete().eq("id", sceneId);
  if (error) throw new Error(error.message);
  revalidatePath(`/studio/${projectId}`);
}

export async function reorderScenesAction(projectId: string, orderedIds: string[]) {
  const { supabase } = await requireUser();
  await Promise.all(
    orderedIds.map((id, index) => supabase.from("scenes").update({ sort_order: index + 1 }).eq("id", id)),
  );
  revalidatePath(`/studio/${projectId}`);
}

export async function deleteAssetAction(assetId: string, projectId: string) {
  const { supabase } = await requireUser();
  const { data: asset } = await supabase.from("uploaded_assets").select("storage_path").eq("id", assetId).single();
  if (asset?.storage_path) {
    await supabase.storage.from("assets").remove([asset.storage_path]);
  }
  const { error } = await supabase.from("uploaded_assets").delete().eq("id", assetId);
  if (error) throw new Error(error.message);
  revalidatePath(`/studio/${projectId}`);
}

export async function setTakeApprovalAction(
  takeId: string,
  projectId: string,
  patch: Partial<Pick<Database["public"]["Tables"]["generation_takes"]["Row"], "approval_status" | "is_favorite" | "notes">>,
) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("generation_takes").update(patch).eq("id", takeId);
  if (error) throw new Error(error.message);
  revalidatePath(`/studio/${projectId}`);
  revalidatePath("/history");
}

export async function selectTakeAction(sceneId: string, takeId: string, projectId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("scenes").update({ selected_take_id: takeId }).eq("id", sceneId);
  if (error) throw new Error(error.message);
  revalidatePath(`/studio/${projectId}`);
}
