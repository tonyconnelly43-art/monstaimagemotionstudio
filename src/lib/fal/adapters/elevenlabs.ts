import "server-only";
import { getVoiceModel } from "@/lib/fal/models";
import type { VoiceGenerationParams } from "@/lib/fal/adapters/types";

/**
 * Maps generic Voice Studio params onto the fal-ai/elevenlabs/tts/eleven-v3
 * input schema. Inline performance-direction tags like [excited] or
 * [whispers] are supported natively by Eleven v3 as part of `text`.
 */
export function buildElevenLabsInput(params: VoiceGenerationParams): Record<string, unknown> {
  const model = getVoiceModel(params.modelId);
  if (!model || !model.isWired) {
    throw new Error(`Voice model ${params.modelId} is not wired for generation yet.`);
  }

  const input: Record<string, unknown> = {
    text: params.text,
  };
  if (params.voice) input.voice = params.voice;
  if (params.stability !== undefined && model.capabilities.supportsStability) {
    input.stability = params.stability;
  }
  if (params.languageCode && model.capabilities.supportsLanguageCode) {
    input.language_code = params.languageCode;
  }
  if (params.timestamps !== undefined && model.capabilities.supportsTimestamps) {
    input.timestamps = params.timestamps;
  }
  return input;
}

export interface ElevenLabsOutput {
  audio: { url: string; content_type?: string; file_name?: string; file_size?: number };
  timestamps?: unknown[];
}
