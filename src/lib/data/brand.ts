import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;
export type BrandProject = Database["public"]["Tables"]["brand_projects"]["Row"];
export type BrandReference = Database["public"]["Tables"]["brand_references"]["Row"];
export type BrandGenerationBatch = Database["public"]["Tables"]["brand_generation_batches"]["Row"];
export type BrandElementType = BrandGenerationBatch["element_type"];

export interface BrandVectorBand {
  threshold: number;
  path: string;
  color: string;
}

export interface BrandVectorLayers {
  width: number;
  height: number;
  bands: BrandVectorBand[];
}

/** Reads and type-narrows the jsonb vector column for one brand element, or null if it hasn't been vectorized yet. */
export function getBrandVector(project: BrandProject, elementType: BrandElementType): BrandVectorLayers | null {
  const value =
    elementType === "mascot" ? project.mascot_vector : elementType === "wordmark" ? project.wordmark_vector : project.background_vector;
  return (value as BrandVectorLayers | null) ?? null;
}

export const BRAND_ELEMENT_TYPES: { value: BrandElementType; label: string; aspectRatio: string }[] = [
  { value: "mascot", label: "Mascot", aspectRatio: "1:1" },
  { value: "wordmark", label: "Wordmark", aspectRatio: "16:9" },
  { value: "background", label: "Background", aspectRatio: "16:9" },
];

export async function listBrandProjects(supabase: Client) {
  const { data, error } = await supabase.from("brand_projects").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getBrandProject(supabase: Client, id: string) {
  const { data, error } = await supabase.from("brand_projects").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listBrandReferences(supabase: Client, brandProjectId: string) {
  const { data, error } = await supabase
    .from("brand_references")
    .select("*")
    .eq("brand_project_id", brandProjectId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listBrandBatches(supabase: Client, brandProjectId: string) {
  const { data, error } = await supabase
    .from("brand_generation_batches")
    .select("*")
    .eq("brand_project_id", brandProjectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
