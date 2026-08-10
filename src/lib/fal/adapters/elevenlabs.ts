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

// ---------------------------------------------------------------------------
// Voice Design — generates brand-new synthetic voices from a text
// description, as a separate two-step flow from regular TTS above:
// design (preview a few options) then create (permanently save the one you
// picked). Verified against fal's actual OpenAPI schema for both endpoints
// before wiring — see docs/FAL_INTEGRATION.md.
// ---------------------------------------------------------------------------

export const VOICE_DESIGN_ENDPOINT = "fal-ai/elevenlabs/text-to-voice/design/eleven-v3";
export const VOICE_DESIGN_SAVE_ENDPOINT = "fal-ai/elevenlabs/text-to-voice/create";

export interface VoiceDesignParams {
  /** 20–1000 chars per fal's schema — describes how the voice should sound. */
  prompt: string;
  /** 100–1000 chars if provided; omitted in favor of auto_generate_text otherwise. */
  sampleText?: string;
}

export function buildVoiceDesignInput(params: VoiceDesignParams): Record<string, unknown> {
  const input: Record<string, unknown> = { prompt: params.prompt };
  if (params.sampleText?.trim()) {
    input.text = params.sampleText.trim();
    input.auto_generate_text = false;
  } else {
    input.auto_generate_text = true;
  }
  return input;
}

export interface VoiceDesignPreview {
  audio: { url: string; content_type?: string };
  generated_voice_id: string;
  media_type: string;
  duration_seconds: number;
  language?: string | null;
}

export interface VoiceDesignOutput {
  text: string;
  previews: VoiceDesignPreview[];
  seed: number;
  voice_id?: string | null;
}

export interface VoiceDesignSaveOutput {
  voice_id: string;
  audio: { url: string; content_type?: string };
}
