import "server-only";
import { getVideoModel } from "@/lib/fal/models";
import type { VideoGenerationParams } from "@/lib/fal/adapters/types";

/**
 * Maps generic Studio params onto the exact field names the selected
 * Seedance 2.0 endpoint accepts. Only includes fields the endpoint's
 * capabilities say it supports — never sends a field the schema doesn't have.
 */
export function buildSeedanceInput(params: VideoGenerationParams): Record<string, unknown> {
  const model = getVideoModel(params.modelId);
  if (!model) {
    throw new Error(`Unknown video model: ${params.modelId}`);
  }

  const input: Record<string, unknown> = {
    prompt: params.prompt,
  };

  if (model.capabilities.supportsReferenceToVideo) {
    const imageUrls = [
      ...(params.imageUrl ? [params.imageUrl] : []),
      ...(params.referenceImageUrls ?? []),
    ];
    if (imageUrls.length > 0) input.image_urls = imageUrls.slice(0, model.capabilities.maxReferenceImages);
    if (params.referenceVideoUrls?.length) {
      input.video_urls = params.referenceVideoUrls.slice(0, model.capabilities.maxReferenceVideos);
    }
    if (params.referenceAudioUrls?.length) {
      input.audio_urls = params.referenceAudioUrls.slice(0, model.capabilities.maxReferenceAudio);
    }
  } else if (model.capabilities.supportsImageToVideo) {
    if (!params.imageUrl) {
      throw new Error(`${model.displayName} requires a starting image_url.`);
    }
    input.image_url = params.imageUrl;
    if (model.capabilities.supportsEndFrame && params.endImageUrl) {
      input.end_image_url = params.endImageUrl;
    }
  }

  if (params.resolution && model.capabilities.resolutions.includes(params.resolution)) {
    input.resolution = params.resolution;
  }
  if (params.duration !== undefined) {
    const allowed = model.capabilities.durations.includes(params.duration);
    if (allowed) input.duration = params.duration;
  }
  if (params.aspectRatio && model.capabilities.aspectRatios.includes(params.aspectRatio)) {
    input.aspect_ratio = params.aspectRatio;
  }
  if (params.generateAudio !== undefined && model.capabilities.supportsGeneratedAudio) {
    input.generate_audio = params.generateAudio;
  }
  if (params.bitrateMode && model.capabilities.bitrateModes?.includes(params.bitrateMode)) {
    input.bitrate_mode = params.bitrateMode;
  }

  return input;
}

export interface SeedanceOutput {
  video: { url: string; content_type?: string; file_name?: string; file_size?: number };
  seed: number;
}
