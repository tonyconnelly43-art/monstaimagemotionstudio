"use server";

import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { explainFalError } from "@/lib/fal/queue";
import { generateImageBlobs } from "@/lib/actions/image-generation";
import { BRAND_ELEMENT_TYPES, type BrandElementType, type BrandProject } from "@/lib/data/brand";

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

/** Which element_type's custom rules column applies. */
function getElementRules(project: BrandProject, elementType: BrandElementType): string | null {
  if (elementType === "mascot") return project.mascot_rules;
  if (elementType === "wordmark") return project.wordmark_rules;
  return project.background_rules;
}

export async function updateBrandRulesAction(brandProjectId: string, elementType: BrandElementType, rules: string) {
  const { supabase } = await requireUser();
  const patch =
    elementType === "mascot"
      ? { mascot_rules: rules }
      : elementType === "wordmark"
        ? { wordmark_rules: rules }
        : { background_rules: rules };
  const { error } = await supabase.from("brand_projects").update(patch).eq("id", brandProjectId);
  if (error) throw new Error(error.message);
  revalidatePath(`/brand-generator/${brandProjectId}`);
}

/**
 * Default style direction per element, grounded in the home-service mascot
 * branding category (KickCharge Creative, Fortitude Creative): bold cartoon
 * mascots with clean thick outlines, vibrant flat colors, and confident bold
 * wordmark lettering built for legibility on truck wraps and yard signs. The
 * uploaded reference photos and each element's own custom rules are what
 * actually lock in the exact look — this text is just a baseline.
 */
const DEFAULT_ELEMENT_STYLE: Record<BrandElementType, string> = {
  mascot:
    "Bold, friendly cartoon mascot character logo mark in the style of top home-service branding agencies (KickCharge Creative, Fortitude Creative): clean thick outlines, simple geometric shapes, vibrant flat colors, confident and approachable pose and expression, isolated on a plain white background, no text.",
  wordmark:
    "Bold, custom lettering wordmark logo type for a home service company, in the style of top home-service branding agencies: clean and highly legible at a distance (for truck wraps and yard signs), strong confident letterforms, vibrant flat colors, isolated on a plain white background, no extra imagery.",
  background:
    "A flat, vibrant background pattern or brand backdrop suited to sit behind a home-service company's mascot and wordmark logo — simple geometric or thematic shapes, a complementary color palette, no text, no photorealism.",
};

/** Applies to every brand element and the final combine step: the "hand-illustrated, not sterile-AI" look the user asked for. */
const HAND_DRAWN_TOUCH =
  "Render it as if hand-illustrated by a professional illustrator working in Procreate: confident, deliberate linework with the natural slight variation of a real hand-drawn line, visible digital brush/ink texture, and organic shading — polished and production-ready, but with a human touch rather than looking like sterile, vector-perfect AI output.";

export interface GenerateBrandOptionsResult {
  batchId?: string;
  imageUrls?: string[];
  error?: string;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/** Uploads generated blobs, records the batch, and returns it — shared by fresh generation and "generate similar." */
async function saveBrandBatch(
  supabase: SupabaseServerClient,
  userId: string,
  brandProjectId: string,
  elementType: BrandElementType,
  fullPrompt: string,
  blobs: Blob[],
): Promise<GenerateBrandOptionsResult> {
  const imageUrls: string[] = [];
  for (const blob of blobs) {
    const storagePath = `${userId}/brand/${brandProjectId}/${elementType}/${uuidv4()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(storagePath, blob, { contentType: "image/png", upsert: false });
    if (uploadError) return { error: uploadError.message };
    const { data: publicUrlData } = supabase.storage.from("assets").getPublicUrl(storagePath);
    imageUrls.push(publicUrlData.publicUrl);
  }

  const { data: batch, error: insertError } = await supabase
    .from("brand_generation_batches")
    .insert({ user_id: userId, brand_project_id: brandProjectId, element_type: elementType, prompt: fullPrompt, image_urls: imageUrls })
    .select("id")
    .single();
  if (insertError || !batch) return { error: insertError?.message ?? "Could not save the generated options." };

  return { batchId: batch.id, imageUrls };
}

/** Generates 3 candidate options for one brand element, using only that element's own reference pool and rules. */
export async function generateBrandOptionsAction(
  brandProjectId: string,
  elementType: BrandElementType,
  prompt: string,
): Promise<GenerateBrandOptionsResult> {
  try {
    const { supabase, user } = await requireUser();

    const [{ data: project }, { data: references }] = await Promise.all([
      supabase.from("brand_projects").select("*").eq("id", brandProjectId).maybeSingle(),
      supabase
        .from("brand_references")
        .select("image_url")
        .eq("brand_project_id", brandProjectId)
        .eq("element_type", elementType),
    ]);
    if (!project) return { error: "Brand project not found." };

    const fullPrompt = [
      DEFAULT_ELEMENT_STYLE[elementType],
      HAND_DRAWN_TOUCH,
      getElementRules(project, elementType),
      `Company: ${project.name}.${project.company_info ? ` ${project.company_info}` : ""}`,
      prompt.trim(),
    ]
      .filter(Boolean)
      .join("\n\n");

    const aspectRatio = BRAND_ELEMENT_TYPES.find((t) => t.value === elementType)?.aspectRatio ?? "1:1";
    const referenceImageUrls = (references ?? []).map((r) => r.image_url);
    const blobs = await generateImageBlobs(fullPrompt, referenceImageUrls, 3, aspectRatio);

    const result = await saveBrandBatch(supabase, user.id, brandProjectId, elementType, fullPrompt, blobs);
    if (!result.error) revalidatePath(`/brand-generator/${brandProjectId}`);
    return result;
  } catch (err) {
    const { message } = explainFalError(err);
    return { error: message };
  }
}

/** Generates 2 more options that stay close to a chosen favorite, keeping the favorite in view alongside them. */
export async function generateSimilarBrandOptionsAction(
  brandProjectId: string,
  elementType: BrandElementType,
  anchorImageUrl: string,
  prompt: string,
): Promise<GenerateBrandOptionsResult> {
  try {
    const { supabase, user } = await requireUser();

    const [{ data: project }, { data: references }] = await Promise.all([
      supabase.from("brand_projects").select("*").eq("id", brandProjectId).maybeSingle(),
      supabase
        .from("brand_references")
        .select("image_url")
        .eq("brand_project_id", brandProjectId)
        .eq("element_type", elementType),
    ]);
    if (!project) return { error: "Brand project not found." };

    const fullPrompt = [
      DEFAULT_ELEMENT_STYLE[elementType],
      HAND_DRAWN_TOUCH,
      getElementRules(project, elementType),
      `Company: ${project.name}.${project.company_info ? ` ${project.company_info}` : ""}`,
      "Generate close variations that follow the same overall design, pose/composition, and color palette as the anchor reference image — keep it recognizably the same concept, with only minor creative variation.",
      prompt.trim(),
    ]
      .filter(Boolean)
      .join("\n\n");

    const aspectRatio = BRAND_ELEMENT_TYPES.find((t) => t.value === elementType)?.aspectRatio ?? "1:1";
    const referenceImageUrls = [...(references ?? []).map((r) => r.image_url), anchorImageUrl];
    const blobs = await generateImageBlobs(fullPrompt, referenceImageUrls, 2, aspectRatio);

    const result = await saveBrandBatch(supabase, user.id, brandProjectId, elementType, fullPrompt, blobs);
    if (result.error || !result.batchId) return result;

    // Keep the favorite visible alongside its 2 new siblings so the preview still shows 3 to choose from.
    const imageUrls = [anchorImageUrl, ...(result.imageUrls ?? [])];
    const { error: updateError } = await supabase
      .from("brand_generation_batches")
      .update({ image_urls: imageUrls })
      .eq("id", result.batchId);
    if (updateError) return { error: updateError.message };

    revalidatePath(`/brand-generator/${brandProjectId}`);
    return { batchId: result.batchId, imageUrls };
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
      HAND_DRAWN_TOUCH,
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
