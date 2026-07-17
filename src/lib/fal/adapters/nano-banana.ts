import "server-only";
import { getImageModel } from "@/lib/fal/models";

export interface ImageGenerationParams {
  modelId: string;
  prompt: string;
  referenceImageUrls?: string[];
  aspectRatio?: string;
  numImages?: number;
}

export interface ImageGenerationTarget {
  falEndpointId: string;
  input: Record<string, unknown>;
}

/**
 * Picks the edit endpoint (image_urls in) whenever reference images are
 * supplied — that's what gives Nano Banana Pro its character-consistency
 * behavior — and falls back to plain text-to-image otherwise.
 */
export function buildNanoBananaTarget(params: ImageGenerationParams): ImageGenerationTarget {
  const model = getImageModel(params.modelId);
  if (!model) throw new Error(`Unknown image model: ${params.modelId}`);

  const references = (params.referenceImageUrls ?? []).slice(0, model.capabilities.maxReferenceImages);
  const input: Record<string, unknown> = {
    prompt: params.prompt,
    num_images: params.numImages ?? 1,
    output_format: "png",
  };
  if (params.aspectRatio && model.capabilities.aspectRatios.includes(params.aspectRatio)) {
    input.aspect_ratio = params.aspectRatio;
  }

  if (references.length > 0) {
    input.image_urls = references;
    return { falEndpointId: model.falEditEndpointId, input };
  }
  return { falEndpointId: model.falEndpointId, input };
}

export interface NanoBananaOutput {
  images: { url: string; content_type?: string; file_name?: string; width?: number; height?: number }[];
  description: string;
}
