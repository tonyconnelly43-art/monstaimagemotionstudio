"use server";

import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { explainFalError } from "@/lib/fal/queue";
import { generateImageBlobs } from "@/lib/actions/image-generation";
import { BRAND_ELEMENT_TYPES, type BrandElementType } from "@/lib/data/brand";

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in.");
  return { supabase, user };
}

export interface CreateBrandProjectResult {
  id?: string;
  error?: string;
}

export async function createBrandProjectAction(name: string, companyInfo: string): Promise<CreateBrandProjectResult> {
  try {
    if (!name.trim()) return { error: "Give the brand a company name first." };
    const { supabase, user } = await requireUser();
    const { data, error } = await supabase
      .from("brand_projects")
      .insert({ user_id: user.id, name: name.trim(), company_info: companyInfo.trim() || null })
      .select("id")
      .single();
    if (error || !data) return { error: error?.message ?? "Could not create the brand project." };
    revalidatePath("/brand-generator");
    return { id: data.id };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not create the brand project." };
  }
}

export async function updateBrandProjectAction(id: string, patch: { name?: string; company_info?: string }) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("brand_projects").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/brand-generator/${id}`);
}

export async function deleteBrandProjectAction(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("brand_projects").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/brand-generator");
}

export async function deleteBrandReferenceAction(id: string, brandProjectId: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("brand_references").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/brand-generator/${brandProjectId}`);
}

/**
 * Default style direction per element, grounded in the home-service mascot
 * branding category (KickCharge Creative, Fortitude Creative): bold cartoon
 * mascots with clean thick outlines, vibrant flat colors, and confident bold
 * wordmark lettering built for legibility on truck wraps and yard signs. The
 * uploaded reference photos are what actually lock in the exact look — this
 * text is secondary reinforcement, same architecture as Hoop Squad's style.
 */
const DEFAULT_ELEMENT_STYLE: Record<BrandElementType, string> = {
  mascot:
    "Bold, friendly cartoon mascot character logo mark in the style of top home-service branding agencies (KickCharge Creative, Fortitude Creative): clean thick outlines, simple geometric shapes, vibrant flat colors, confident and approachable pose and expression, isolated on a plain white background, no text.",
  wordmark:
    "Bold, custom lettering wordmark logo type for a home service company, in the style of top home-service branding agencies: clean and highly legible at a distance (for truck wraps and yard signs), strong confident letterforms, vibrant flat colors, isolated on a plain white background, no extra imagery.",
  background:
    "A flat, vibrant background pattern or brand backdrop suited to sit behind a home-service company's mascot and wordmark logo — simple geometric or thematic shapes, a complementary color palette, no text, no photorealism.",
};

export interface GenerateBrandOptionsResult {
  batchId?: string;
  imageUrls?: string[];
  error?: string;
}

/** Generates 3 candidate options for one brand element in a single fal.ai call. */
export async function generateBrandOptionsAction(
  brandProjectId: string,
  elementType: BrandElementType,
  prompt: string,
): Promise<GenerateBrandOptionsResult> {
  try {
    const { supabase, user } = await requireUser();

    const [{ data: project }, { data: references }] = await Promise.all([
      supabase.from("brand_projects").select("name, company_info").eq("id", brandProjectId).maybeSingle(),
      supabase.from("brand_references").select("image_url").eq("brand_project_id", brandProjectId),
    ]);
    if (!project) return { error: "Brand project not found." };

    const fullPrompt = [
      DEFAULT_ELEMENT_STYLE[elementType],
      `Company: ${project.name}.${project.company_info ? ` ${project.company_info}` : ""}`,
      prompt.trim(),
    ]
      .filter(Boolean)
      .join("\n\n");

    const aspectRatio = BRAND_ELEMENT_TYPES.find((t) => t.value === elementType)?.aspectRatio ?? "1:1";
    const referenceImageUrls = (references ?? []).map((r) => r.image_url);
    const blobs = await generateImageBlobs(fullPrompt, referenceImageUrls, 3, aspectRatio);

    const imageUrls: string[] = [];
    for (const blob of blobs) {
      const storagePath = `${user.id}/brand/${brandProjectId}/${elementType}/${uuidv4()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(storagePath, blob, { contentType: "image/png", upsert: false });
      if (uploadError) return { error: uploadError.message };
      const { data: publicUrlData } = supabase.storage.from("assets").getPublicUrl(storagePath);
      imageUrls.push(publicUrlData.publicUrl);
    }

    const { data: batch, error: insertError } = await supabase
      .from("brand_generation_batches")
      .insert({
        user_id: user.id,
        brand_project_id: brandProjectId,
        element_type: elementType,
        prompt: fullPrompt,
        image_urls: imageUrls,
      })
      .select("id")
      .single();
    if (insertError || !batch) return { error: insertError?.message ?? "Could not save the generated options." };

    revalidatePath(`/brand-generator/${brandProjectId}`);
    return { batchId: batch.id, imageUrls };
  } catch (err) {
    const { message } = explainFalError(err);
    return { error: message };
  }
}

export async function selectBrandFavoriteAction(brandProjectId: string, elementType: BrandElementType, imageUrl: string) {
  const { supabase } = await requireUser();
  const patch =
    elementType === "mascot"
      ? { mascot_favorite_url: imageUrl }
      : elementType === "wordmark"
        ? { wordmark_favorite_url: imageUrl }
        : { background_favorite_url: imageUrl };
  const { error } = await supabase.from("brand_projects").update(patch).eq("id", brandProjectId);
  if (error) throw new Error(error.message);
  revalidatePath(`/brand-generator/${brandProjectId}`);
}

export interface GenerateFinalBrandResult {
  finalUrl?: string;
  error?: string;
}

/** Combines the three chosen favorites into one final cohesive brand lockup. */
export async function generateFinalBrandAction(brandProjectId: string, prompt: string): Promise<GenerateFinalBrandResult> {
  try {
    const { supabase, user } = await requireUser();
    const { data: project } = await supabase.from("brand_projects").select("*").eq("id", brandProjectId).maybeSingle();
    if (!project) return { error: "Brand project not found." };
    if (!project.mascot_favorite_url || !project.wordmark_favorite_url || !project.background_favorite_url) {
      return { error: "Pick a favorite Mascot, Wordmark, and Background first." };
    }

    const fullPrompt = [
      `Combine these three approved brand elements for ${project.name} into one cohesive final logo/brand presentation: the mascot character, the wordmark lettering, and the background.`,
      "Keep every element's exact design, colors, and proportions as shown in the reference images — do not redraw or restyle any of them.",
      "Arrange them into a clean, professional lockup suitable for a home service company (truck wrap, yard sign, uniform): mascot alongside or above the wordmark, set against the background.",
      prompt.trim(),
    ]
      .filter(Boolean)
      .join("\n\n");

    const [blob] = await generateImageBlobs(
      fullPrompt,
      [project.mascot_favorite_url, project.wordmark_favorite_url, project.background_favorite_url],
      1,
      "1:1",
    );

    const storagePath = `${user.id}/brand/${brandProjectId}/final/${uuidv4()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(storagePath, blob, { contentType: "image/png", upsert: false });
    if (uploadError) return { error: uploadError.message };
    const { data: publicUrlData } = supabase.storage.from("assets").getPublicUrl(storagePath);

    const { error: updateError } = await supabase
      .from("brand_projects")
      .update({ final_brand_url: publicUrlData.publicUrl })
      .eq("id", brandProjectId);
    if (updateError) return { error: updateError.message };

    revalidatePath(`/brand-generator/${brandProjectId}`);
    return { finalUrl: publicUrlData.publicUrl };
  } catch (err) {
    const { message } = explainFalError(err);
    return { error: message };
  }
}
