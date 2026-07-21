"use server";

import { v4 as uuidv4 } from "uuid";
import { revalidatePath } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { explainFalError } from "@/lib/fal/queue";
import { generateImageBlobs } from "@/lib/actions/image-generation";
import { BRAND_ELEMENT_TYPES, type BrandElementType, type BrandProject, type BrandVectorLayers } from "@/lib/data/brand";
import { vectorizeToLayers } from "@/lib/vectorize/potrace-layers";
import type { Database } from "@/types/database";

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
 * mascots with clean thick outlines and confident bold wordmark lettering
 * built for legibility on truck wraps and yard signs. Every generation is
 * produced as uncolored black-and-white line art on purpose — this is the
 * pass that later gets vectorized and hand-colored in the app, so no color
 * should ever be baked into the artwork itself. The uploaded reference
 * photos and each element's own custom rules are what actually lock in the
 * exact linework style — this text is just a baseline.
 */
const DEFAULT_ELEMENT_STYLE: Record<BrandElementType, string> = {
  mascot:
    "Bold, friendly cartoon mascot character logo mark in the style of top home-service branding agencies (KickCharge Creative, Fortitude Creative): clean thick black ink outlines, simple geometric shapes, confident and approachable pose and expression, isolated on a plain white background, no text. Pure black-and-white line art — no color anywhere, black ink linework and grayscale shading only, like an uncolored coloring-book page ready to be colored in afterward.",
  wordmark:
    "A wordmark logo built around the company name rendered as bold custom lettering, in the style of top home-service branding agencies. Clean and highly legible at a distance (for truck wraps and yard signs), strong confident letterforms, isolated on a plain white background. Pure black-and-white line art — no color, black ink outlines only. Decorative lettering treatments are welcome — badges, shields, ribbon banners, frames, and texture panels behind the lettering are all fine when asked for. Strict rule that always applies no matter what: never include a mascot, character, animal, or person anywhere in the image — this element is lettering and decorative framing only, never a character illustration. If a reference photo shows a mascot next to a wordmark or badge, ignore the mascot completely and copy only its lettering/badge style.",
  background:
    "A flat black-and-white background pattern or brand backdrop suited to sit behind a home-service company's mascot and wordmark logo — simple geometric or thematic shapes, no text, no photorealism. Pure black-and-white line art — no color, black ink linework and grayscale shading only.",
};

/** Applies to every brand element and the final combine step: the "hand-illustrated, not sterile-AI" look the user asked for. */
const HAND_DRAWN_TOUCH =
  "Render it as if hand-illustrated by a professional illustrator working in Procreate: confident, deliberate linework with the natural slight variation of a real hand-drawn line, visible digital brush/ink texture, and organic shading — polished and production-ready, but with a human touch rather than looking like sterile, vector-perfect AI output. Keep the linework clean and fully closed (no broken or open outlines) since this artwork will be vectorized and colored afterward.";

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
      `Show these three approved brand elements for ${project.name} applied as a full vehicle wrap on a cargo van — a realistic van wrap mockup, not a flat logo lockup.`,
      "Layout (always follow this): the mascot character stands full-body near the FRONT of the van's side panel, positioned in front of (overlapping) the wordmark. The wordmark/badge is rendered larger than the mascot and sits more toward the middle-to-rear of the side panel, behind or beside the mascot. The background pattern fills the remaining wrap space as a supporting texture/color field behind everything, not the focal point.",
      "Include two views side by side: a full side-profile view of the van (following the layout above), and a rear/back-door view where only the wordmark/badge is shown large and centered — no full-body mascot on the back door.",
      "Keep every element's exact design and proportions unchanged from the reference images — this is a mockup of the existing brand applied to a vehicle, not a redesign of any element.",
      HAND_DRAWN_TOUCH,
      "Pure black-and-white line art throughout the van illustration, no color anywhere, grayscale shading only — matching the individual brand elements' current uncolored style, ready to be colored in afterward.",
      prompt.trim(),
    ]
      .filter(Boolean)
      .join("\n\n");

    const [blob] = await generateImageBlobs(
      fullPrompt,
      [project.mascot_favorite_url, project.wordmark_favorite_url, project.background_favorite_url],
      1,
      "16:9",
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

function vectorColumnPatch(elementType: BrandElementType, vector: BrandVectorLayers) {
  const value = vector as unknown as Database["public"]["Tables"]["brand_projects"]["Row"]["mascot_vector"];
  if (elementType === "mascot") return { mascot_vector: value };
  if (elementType === "wordmark") return { wordmark_vector: value };
  return { background_vector: value };
}

export interface VectorizeBrandElementResult {
  vector?: BrandVectorLayers;
  error?: string;
}

/** Traces a generated (black-and-white) brand element image into a layered, recolorable vector and saves it. */
export async function vectorizeBrandElementAction(
  brandProjectId: string,
  elementType: BrandElementType,
  imageUrl: string,
): Promise<VectorizeBrandElementResult> {
  try {
    const { supabase } = await requireUser();

    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) return { error: "Could not fetch that image to vectorize it." };
    const buffer = Buffer.from(await imageResponse.arrayBuffer());

    const vector = await vectorizeToLayers(buffer);
    if (vector.bands.length === 0) return { error: "Couldn't find any traceable linework in that image." };

    const { error } = await supabase
      .from("brand_projects")
      .update(vectorColumnPatch(elementType, vector))
      .eq("id", brandProjectId);
    if (error) return { error: error.message };

    revalidatePath(`/brand-generator/${brandProjectId}`);
    return { vector };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not vectorize that image." };
  }
}

/** Persists the user's chosen band colors for a vectorized element (so reopening the color editor keeps their picks). */
export async function updateBrandVectorColorsAction(
  brandProjectId: string,
  elementType: BrandElementType,
  vector: BrandVectorLayers,
) {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("brand_projects")
    .update(vectorColumnPatch(elementType, vector))
    .eq("id", brandProjectId);
  if (error) throw new Error(error.message);
  revalidatePath(`/brand-generator/${brandProjectId}`);
}
