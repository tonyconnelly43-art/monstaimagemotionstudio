"use client";

import { v4 as uuidv4 } from "uuid";
import { createClient } from "@/lib/supabase/client";
import { safeFileName, validateAudioUploadFile, validateUploadFile } from "@/lib/validation/upload";
import type { Database } from "@/types/database";

type AssetRole = Database["public"]["Tables"]["uploaded_assets"]["Row"]["role"];
type CharacterReferenceType = Database["public"]["Tables"]["character_references"]["Row"]["reference_type"];
type AudioTrackType = Database["public"]["Tables"]["audio_tracks"]["Row"]["track_type"];

async function requireBrowserUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

async function uploadToAssetsBucket(userId: string, folderSegments: string[], file: File) {
  const validation = validateUploadFile(file);
  if (!validation.ok) throw new Error(validation.message);

  const supabase = createClient();
  const storagePath = `${[userId, ...folderSegments].join("/")}/${uuidv4()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from("assets")
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { data: publicUrl } = supabase.storage.from("assets").getPublicUrl(storagePath);
  return { storagePath, url: publicUrl.publicUrl };
}

export interface UploadAssetParams {
  file: File;
  role: AssetRole;
  projectId?: string;
  sceneId?: string;
  characterId?: string;
  hoopSquadSceneId?: string;
}

/**
 * Uploads a file directly to Supabase Storage from the browser (RLS-scoped
 * to the signed-in user's own folder via the anon key) and records the
 * metadata row. No server round-trip for the file bytes, and no secret key
 * is ever used client-side.
 */
export async function uploadAsset(params: UploadAssetParams) {
  const { supabase, user } = await requireBrowserUser();
  const segments = [];
  if (params.projectId) segments.push("projects", params.projectId);
  if (params.sceneId) segments.push("scenes", params.sceneId);
  if (params.characterId) segments.push("characters", params.characterId);
  if (params.hoopSquadSceneId) segments.push("locations", params.hoopSquadSceneId);
  const { storagePath, url } = await uploadToAssetsBucket(user.id, segments, params.file);

  const { data: asset, error: insertError } = await supabase
    .from("uploaded_assets")
    .insert({
      user_id: user.id,
      project_id: params.projectId ?? null,
      scene_id: params.sceneId ?? null,
      character_id: params.characterId ?? null,
      hoop_squad_scene_id: params.hoopSquadSceneId ?? null,
      storage_path: storagePath,
      public_url: url,
      file_name: params.file.name,
      mime_type: params.file.type,
      file_size: params.file.size,
      role: params.role,
    })
    .select("*")
    .single();
  if (insertError || !asset) {
    await supabase.storage.from("assets").remove([storagePath]);
    throw new Error(insertError?.message ?? "Could not save the upload.");
  }

  return asset;
}

/** Uploads and sets one of a character's named profile image fields (main/front/side/back). */
export async function uploadCharacterProfileImage(
  characterId: string,
  field: "main_image_url" | "front_view_url" | "side_view_url" | "back_view_url",
  file: File,
) {
  const { supabase, user } = await requireBrowserUser();
  const { url } = await uploadToAssetsBucket(user.id, ["characters", characterId], file);
  const { error } = await supabase.from("characters").update({ [field]: url } as never).eq("id", characterId);
  if (error) throw new Error(error.message);
  return url;
}

/** Uploads an additional character reference (pose, expression, uniform, prop, style, motion). */
export async function uploadCharacterReference(
  characterId: string,
  referenceType: CharacterReferenceType,
  label: string,
  file: File,
) {
  const { supabase, user } = await requireBrowserUser();
  const { url } = await uploadToAssetsBucket(user.id, ["characters", characterId, "references"], file);
  const { data, error } = await supabase
    .from("character_references")
    .insert({ user_id: user.id, character_id: characterId, reference_type: referenceType, label, image_url: url })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not save the reference image.");
  return data;
}

/** Uploads and sets one of a saved location's named view fields (wide, entrance, empty, etc). */
export async function uploadHoopSquadSceneView(
  hoopSquadSceneId: string,
  field: string,
  file: File,
) {
  const { supabase, user } = await requireBrowserUser();
  const { url } = await uploadToAssetsBucket(user.id, ["locations", hoopSquadSceneId], file);
  const { error } = await supabase.from("hoop_squad_scenes").update({ [field]: url } as never).eq("id", hoopSquadSceneId);
  if (error) throw new Error(error.message);
  return url;
}

/** Uploads an additional camera-angle view tied to a saved location's reusable view set. */
export async function uploadSceneReference(hoopSquadSceneId: string, viewLabel: string, file: File) {
  const { supabase, user } = await requireBrowserUser();
  const { url } = await uploadToAssetsBucket(user.id, ["locations", hoopSquadSceneId, "views"], file);
  const { data, error } = await supabase
    .from("scene_references")
    .insert({ user_id: user.id, hoop_squad_scene_id: hoopSquadSceneId, view_label: viewLabel, image_url: url })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not save the view.");
  return data;
}

async function uploadAudioFile(userId: string, folderSegments: string[], file: File) {
  const validation = validateAudioUploadFile(file);
  if (!validation.ok) throw new Error(validation.message);

  const supabase = createClient();
  const storagePath = `${[userId, ...folderSegments].join("/")}/${uuidv4()}-${safeFileName(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from("assets")
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw new Error(uploadError.message);

  const { data: publicUrl } = supabase.storage.from("assets").getPublicUrl(storagePath);
  return publicUrl.publicUrl;
}

/** Uploads a voice-cloning reference clip. Caller must have already confirmed consent. */
export async function uploadVoiceCloneReference(voiceId: string, file: File) {
  const { user } = await requireBrowserUser();
  return uploadAudioFile(user.id, ["voices", voiceId], file);
}

type BrandElementType = Database["public"]["Tables"]["brand_references"]["Row"]["element_type"];

/** Uploads a Home Service Brand Generator reference photo, scoped to one element type's own reference pool. */
export async function uploadBrandReference(
  brandProjectId: string,
  elementType: BrandElementType,
  label: string,
  file: File,
) {
  const { supabase, user } = await requireBrowserUser();
  const { url } = await uploadToAssetsBucket(user.id, ["brand", brandProjectId, elementType, "references"], file);
  const { data, error } = await supabase
    .from("brand_references")
    .insert({ user_id: user.id, brand_project_id: brandProjectId, element_type: elementType, image_url: url, label })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not save the reference image.");
  return data;
}

/**
 * Uploads a manually-prepared image (e.g. a design cropped out of a
 * multi-design "contact sheet" the model shouldn't have produced) straight
 * to storage, with no generation batch or reference-pool row attached — the
 * caller is expected to set it as the element's favorite directly.
 */
export async function uploadBrandCustomFavorite(brandProjectId: string, elementType: BrandElementType, file: File) {
  const { user } = await requireBrowserUser();
  const { url } = await uploadToAssetsBucket(user.id, ["brand", brandProjectId, elementType, "custom"], file);
  return url;
}

/** Uploads a music/SFX/ambience/voiceover file and creates its audio_tracks row. */
export async function uploadAudioTrack(sceneId: string, trackType: AudioTrackType, label: string, file: File) {
  const { supabase, user } = await requireBrowserUser();
  const url = await uploadAudioFile(user.id, ["scenes", sceneId, "audio"], file);
  const { count } = await supabase.from("audio_tracks").select("id", { count: "exact", head: true }).eq("scene_id", sceneId);
  const { data, error } = await supabase
    .from("audio_tracks")
    .insert({
      user_id: user.id,
      scene_id: sceneId,
      track_type: trackType,
      label,
      source_url: url,
      sort_order: (count ?? 0) + 1,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Could not save the audio track.");
  return data;
}
