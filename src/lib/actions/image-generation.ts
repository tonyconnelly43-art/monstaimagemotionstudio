"use server";

import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { runQueueToCompletion, explainFalError } from "@/lib/fal/queue";
import { buildNanoBananaTarget, type NanoBananaOutput } from "@/lib/fal/adapters/nano-banana";
import { DEFAULT_IMAGE_MODEL_ID } from "@/lib/fal/models";
import type { Database } from "@/types/database";

type CharacterReferenceType = Database["public"]["Tables"]["character_references"]["Row"]["reference_type"];

export interface GenerateReferenceResult {
  imageUrl?: string;
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

/** Runs the fal.ai image generation and downloads the result as a Blob, ready to store. */
async function generateImageBlob(prompt: string, referenceImageUrls: string[]) {
  const { falEndpointId, input } = buildNanoBananaTarget({
    modelId: DEFAULT_IMAGE_MODEL_ID,
    prompt,
    referenceImageUrls,
    aspectRatio: "1:1",
    numImages: 1,
  });
  const result = await runQueueToCompletion<NanoBananaOutput>(falEndpointId, input, 60_000);
  const image = result.images[0];
  if (!image) throw new Error("The model did not return an image. Try again.");

  const res = await fetch(image.url);
  if (!res.ok) throw new Error("Could not download the generated image.");
  return res.blob();
}

/**
 * Generates a new character reference image with Nano Banana Pro and saves
 * it permanently to Storage + character_references, exactly like a manual
 * upload would — the "Generate with AI" button is just another way to fill
 * that same gallery. When useExistingAsGuide is on, the character's own
 * saved photos are passed in as edit-endpoint reference images so the new
 * pose keeps the same face/uniform/colors instead of drifting.
 */
export async function generateCharacterReferenceAction(
  characterId: string,
  referenceType: CharacterReferenceType,
  label: string,
  prompt: string,
  useExistingAsGuide: boolean,
): Promise<GenerateReferenceResult> {
  try {
    const { supabase, user } = await requireUser();

    let referenceImageUrls: string[] = [];
    if (useExistingAsGuide) {
      const [{ data: character }, { data: refs }] = await Promise.all([
        supabase
          .from("characters")
          .select("main_image_url, front_view_url, side_view_url, back_view_url")
          .eq("id", characterId)
          .maybeSingle(),
        supabase.from("character_references").select("image_url").eq("character_id", characterId).limit(10),
      ]);
      referenceImageUrls = [
        character?.main_image_url,
        character?.front_view_url,
        character?.side_view_url,
        character?.back_view_url,
        ...(refs ?? []).map((r) => r.image_url),
      ].filter((u): u is string => Boolean(u));
    }

    const blob = await generateImageBlob(prompt, referenceImageUrls);

    const storagePath = `${user.id}/characters/${characterId}/references/${uuidv4()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(storagePath, blob, { contentType: "image/png", upsert: false });
    if (uploadError) return { error: uploadError.message };

    const { data: publicUrlData } = supabase.storage.from("assets").getPublicUrl(storagePath);
    const { error: insertError } = await supabase.from("character_references").insert({
      user_id: user.id,
      character_id: characterId,
      reference_type: referenceType,
      label,
      image_url: publicUrlData.publicUrl,
    });
    if (insertError) return { error: insertError.message };

    revalidatePath(`/characters/${characterId}`);
    return { imageUrl: publicUrlData.publicUrl };
  } catch (err) {
    const { message } = explainFalError(err);
    return { error: message };
  }
}

/** Same idea as generateCharacterReferenceAction, but for a saved Hoop Squad location's view gallery. */
export async function generateSceneReferenceAction(
  hoopSquadSceneId: string,
  viewLabel: string,
  prompt: string,
  useExistingAsGuide: boolean,
): Promise<GenerateReferenceResult> {
  try {
    const { supabase, user } = await requireUser();

    let referenceImageUrls: string[] = [];
    if (useExistingAsGuide) {
      const [{ data: location }, { data: refs }] = await Promise.all([
        supabase
          .from("hoop_squad_scenes")
          .select(
            "main_image_url, wide_establishing_url, left_side_view_url, right_side_view_url, close_up_background_url, entrance_view_url, daytime_version_url, evening_version_url, empty_version_url",
          )
          .eq("id", hoopSquadSceneId)
          .maybeSingle(),
        supabase.from("scene_references").select("image_url").eq("hoop_squad_scene_id", hoopSquadSceneId).limit(10),
      ]);
      referenceImageUrls = [
        ...(location ? Object.values(location) : []),
        ...(refs ?? []).map((r) => r.image_url),
      ].filter((u): u is string => Boolean(u));
    }

    const blob = await generateImageBlob(prompt, referenceImageUrls);

    const storagePath = `${user.id}/locations/${hoopSquadSceneId}/views/${uuidv4()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(storagePath, blob, { contentType: "image/png", upsert: false });
    if (uploadError) return { error: uploadError.message };

    const { data: publicUrlData } = supabase.storage.from("assets").getPublicUrl(storagePath);
    const { error: insertError } = await supabase.from("scene_references").insert({
      user_id: user.id,
      hoop_squad_scene_id: hoopSquadSceneId,
      view_label: viewLabel,
      image_url: publicUrlData.publicUrl,
    });
    if (insertError) return { error: insertError.message };

    revalidatePath(`/hoop-squad/${hoopSquadSceneId}`);
    return { imageUrl: publicUrlData.publicUrl };
  } catch (err) {
    const { message } = explainFalError(err);
    return { error: message };
  }
}
