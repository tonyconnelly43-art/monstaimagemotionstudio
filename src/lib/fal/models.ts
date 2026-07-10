/**
 * Centralized fal.ai model configuration.
 *
 * This is the single source of truth for model IDs and capabilities. UI
 * components must never hard-code an endpoint ID, duration list, resolution
 * list, or field name — they read capability flags from here so a model swap
 * or a fal API change only requires an edit in this file.
 *
 * Every entry below was populated by inspecting the model's live schema at
 * fal.ai/models/<id>/api (see IMPLEMENTATION_PLAN.md §3 for the inspection
 * notes and date). Do not add a model here from memory/guesswork — inspect
 * the real schema first and set `verifiedAt`.
 */

export type ModelCategory = "video" | "voice" | "lipsync";

export type ConsistencyStrength = "flexible" | "balanced" | "strong" | "maximum";

export type RecommendationMode =
  | "best_quality"
  | "fast_preview"
  | "best_character_consistency"
  | "best_multi_reference"
  | "best_dialogue"
  | "manual";

export interface VideoModelCapabilities {
  /** Endpoint accepts a single starting image (`image_url`). */
  supportsImageToVideo: boolean;
  /** Endpoint accepts multiple reference images/videos/audio (`image_urls[]` etc). */
  supportsReferenceToVideo: boolean;
  /** Endpoint accepts an `end_image_url` for start/end-frame continuity. */
  supportsEndFrame: boolean;
  /** Endpoint can synthesize synchronized audio/dialogue in the same pass. */
  supportsGeneratedAudio: boolean;
  /** Endpoint accepts short audio reference clips (dialogue timing). */
  supportsAudioReference: boolean;
  /** Resolutions this endpoint actually accepts, in the exact enum casing fal uses. */
  resolutions: string[];
  /** Duration values this endpoint actually accepts. "auto" lets fal choose. */
  durations: Array<"auto" | number>;
  /** Longest duration (seconds) this endpoint can produce natively in one call. */
  maxNativeDurationSeconds: number;
  /** Aspect ratios this endpoint actually accepts. */
  aspectRatios: string[];
  /** Max number of reference images (reference-to-video style endpoints only). */
  maxReferenceImages?: number;
  maxReferenceVideos?: number;
  maxReferenceAudio?: number;
  bitrateModes?: string[];
}

export interface VideoModelConfig {
  id: string;
  category: "video";
  displayName: string;
  shortDescription: string;
  falEndpointId: string;
  tier: "fast" | "standard" | "pro";
  recommendedFor: RecommendationMode[];
  capabilities: VideoModelCapabilities;
  verifiedAt: string;
}

export interface VoiceModelCapabilities {
  supportsVoiceSelection: boolean;
  supportsVoiceCloning: boolean;
  supportsMultiSpeaker: boolean;
  supportsStability: boolean;
  supportsSimilarity: boolean;
  supportsSpeed: boolean;
  supportsStyle: boolean;
  supportsEmotionTags: boolean;
  supportsLanguageCode: boolean;
  supportsTimestamps: boolean;
  supportsPronunciationNotes: boolean;
}

export interface VoiceModelConfig {
  id: string;
  category: "voice";
  displayName: string;
  provider: "elevenlabs_via_fal" | "dia" | "f5_tts" | "qwen" | "gemini_tts";
  falEndpointId: string;
  isWired: boolean;
  shortDescription: string;
  capabilities: VoiceModelCapabilities;
  verifiedAt: string | null;
}

export interface LipsyncModelConfig {
  id: string;
  category: "lipsync";
  displayName: string;
  falEndpointId: string;
  isWired: boolean;
  shortDescription: string;
  capabilities: {
    supportsVideoInput: boolean;
    supportsAudioInput: boolean;
    syncModes: string[];
  };
  verifiedAt: string | null;
}

// ---------------------------------------------------------------------------
// Video models — Seedance 2.0 family (verified against fal.ai/models/.../api)
// ---------------------------------------------------------------------------

const SEEDANCE_DURATIONS: Array<"auto" | number> = [
  "auto", 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
];
const SEEDANCE_ASPECT_RATIOS = ["auto", "21:9", "16:9", "4:3", "1:1", "3:4", "9:16"];

export const VIDEO_MODELS: VideoModelConfig[] = [
  {
    id: "seedance-2-image-to-video",
    category: "video",
    displayName: "Seedance 2 — Image to Video",
    shortDescription:
      "ByteDance's flagship image-to-video model. Cinematic camera control, realistic physics, synchronized audio, up to 1080p/4k.",
    falEndpointId: "bytedance/seedance-2.0/image-to-video",
    tier: "pro",
    recommendedFor: ["best_quality"],
    capabilities: {
      supportsImageToVideo: true,
      supportsReferenceToVideo: false,
      supportsEndFrame: true,
      supportsGeneratedAudio: true,
      supportsAudioReference: false,
      resolutions: ["480p", "720p", "1080p", "4k"],
      durations: SEEDANCE_DURATIONS,
      maxNativeDurationSeconds: 15,
      aspectRatios: SEEDANCE_ASPECT_RATIOS,
      bitrateModes: ["standard", "high"],
    },
    verifiedAt: "2026-07-10",
  },
  {
    id: "seedance-2-fast-image-to-video",
    category: "video",
    displayName: "Seedance 2 Fast — Image to Video",
    shortDescription:
      "Same controls as the standard tier at lower latency and cost. Best for quick motion tests and iteration.",
    falEndpointId: "bytedance/seedance-2.0/fast/image-to-video",
    tier: "fast",
    recommendedFor: ["fast_preview"],
    capabilities: {
      supportsImageToVideo: true,
      supportsReferenceToVideo: false,
      supportsEndFrame: true,
      supportsGeneratedAudio: true,
      supportsAudioReference: false,
      resolutions: ["480p", "720p"],
      durations: SEEDANCE_DURATIONS,
      maxNativeDurationSeconds: 15,
      aspectRatios: SEEDANCE_ASPECT_RATIOS,
      bitrateModes: ["standard", "high"],
    },
    verifiedAt: "2026-07-10",
  },
  {
    id: "seedance-2-reference-to-video",
    category: "video",
    displayName: "Seedance 2 — Reference to Video",
    shortDescription:
      "Accepts up to 9 reference images, 3 reference videos, and 3 reference audio clips. Best choice when Character Lock + Scene Lock both need multiple reference images honored at once.",
    falEndpointId: "bytedance/seedance-2.0/reference-to-video",
    tier: "pro",
    recommendedFor: ["best_character_consistency", "best_multi_reference", "best_dialogue"],
    capabilities: {
      supportsImageToVideo: false,
      supportsReferenceToVideo: true,
      supportsEndFrame: false,
      supportsGeneratedAudio: true,
      supportsAudioReference: true,
      resolutions: ["480p", "720p", "1080p", "4k"],
      durations: SEEDANCE_DURATIONS,
      maxNativeDurationSeconds: 15,
      aspectRatios: SEEDANCE_ASPECT_RATIOS,
      maxReferenceImages: 9,
      maxReferenceVideos: 3,
      maxReferenceAudio: 3,
      bitrateModes: ["standard", "high"],
    },
    verifiedAt: "2026-07-10",
  },
];

export const DEFAULT_VIDEO_MODEL_ID = "seedance-2-image-to-video";

// ---------------------------------------------------------------------------
// Voice models
// ---------------------------------------------------------------------------

export const VOICE_MODELS: VoiceModelConfig[] = [
  {
    id: "elevenlabs-eleven-v3",
    category: "voice",
    displayName: "ElevenLabs Eleven v3 (via fal)",
    provider: "elevenlabs_via_fal",
    falEndpointId: "fal-ai/elevenlabs/tts/eleven-v3",
    isWired: true,
    shortDescription:
      "High-quality expressive text-to-speech, including inline performance-direction tags such as [excited] or [whispers].",
    capabilities: {
      supportsVoiceSelection: true,
      supportsVoiceCloning: false,
      supportsMultiSpeaker: false,
      supportsStability: true,
      supportsSimilarity: false,
      supportsSpeed: false,
      supportsStyle: false,
      supportsEmotionTags: true,
      supportsLanguageCode: true,
      supportsTimestamps: true,
      supportsPronunciationNotes: false,
    },
    verifiedAt: "2026-07-10",
  },
  {
    id: "elevenlabs-turbo-v2-5",
    category: "voice",
    displayName: "ElevenLabs Turbo v2.5 (via fal)",
    provider: "elevenlabs_via_fal",
    falEndpointId: "fal-ai/elevenlabs/tts/turbo-v2.5",
    isWired: false,
    shortDescription: "Low-latency ElevenLabs tier — schema not yet inspected/wired.",
    capabilities: {
      supportsVoiceSelection: true,
      supportsVoiceCloning: false,
      supportsMultiSpeaker: false,
      supportsStability: true,
      supportsSimilarity: true,
      supportsSpeed: false,
      supportsStyle: false,
      supportsEmotionTags: false,
      supportsLanguageCode: true,
      supportsTimestamps: false,
      supportsPronunciationNotes: false,
    },
    verifiedAt: null,
  },
  {
    id: "dia-tts",
    category: "voice",
    displayName: "Dia TTS",
    provider: "dia",
    falEndpointId: "fal-ai/dia-tts",
    isWired: false,
    shortDescription: "Dialogue-oriented open TTS model — schema not yet inspected/wired.",
    capabilities: {
      supportsVoiceSelection: false,
      supportsVoiceCloning: false,
      supportsMultiSpeaker: true,
      supportsStability: false,
      supportsSimilarity: false,
      supportsSpeed: false,
      supportsStyle: false,
      supportsEmotionTags: false,
      supportsLanguageCode: false,
      supportsTimestamps: false,
      supportsPronunciationNotes: false,
    },
    verifiedAt: null,
  },
  {
    id: "f5-tts",
    category: "voice",
    displayName: "F5-TTS",
    provider: "f5_tts",
    falEndpointId: "fal-ai/f5-tts",
    isWired: false,
    shortDescription: "Voice-cloning capable TTS — schema not yet inspected/wired.",
    capabilities: {
      supportsVoiceSelection: false,
      supportsVoiceCloning: true,
      supportsMultiSpeaker: false,
      supportsStability: false,
      supportsSimilarity: false,
      supportsSpeed: true,
      supportsStyle: false,
      supportsEmotionTags: false,
      supportsLanguageCode: false,
      supportsTimestamps: false,
      supportsPronunciationNotes: false,
    },
    verifiedAt: null,
  },
  {
    id: "qwen-voice",
    category: "voice",
    displayName: "Qwen Voice Cloning",
    provider: "qwen",
    falEndpointId: "fal-ai/qwen-tts",
    isWired: false,
    shortDescription: "Voice cloning model — schema not yet inspected/wired.",
    capabilities: {
      supportsVoiceSelection: false,
      supportsVoiceCloning: true,
      supportsMultiSpeaker: false,
      supportsStability: false,
      supportsSimilarity: false,
      supportsSpeed: false,
      supportsStyle: false,
      supportsEmotionTags: false,
      supportsLanguageCode: true,
      supportsTimestamps: false,
      supportsPronunciationNotes: false,
    },
    verifiedAt: null,
  },
  {
    id: "gemini-tts",
    category: "voice",
    displayName: "Gemini TTS",
    provider: "gemini_tts",
    falEndpointId: "fal-ai/gemini-tts",
    isWired: false,
    shortDescription: "Google Gemini text-to-speech — schema not yet inspected/wired.",
    capabilities: {
      supportsVoiceSelection: true,
      supportsVoiceCloning: false,
      supportsMultiSpeaker: true,
      supportsStability: false,
      supportsSimilarity: false,
      supportsSpeed: true,
      supportsStyle: true,
      supportsEmotionTags: false,
      supportsLanguageCode: true,
      supportsTimestamps: false,
      supportsPronunciationNotes: false,
    },
    verifiedAt: null,
  },
];

export const DEFAULT_VOICE_MODEL_ID = "elevenlabs-eleven-v3";

// ---------------------------------------------------------------------------
// Lip-sync models (Phase 4 — architecture ready, not yet enabled by default)
// ---------------------------------------------------------------------------

export const LIPSYNC_MODELS: LipsyncModelConfig[] = [
  {
    id: "sync-lipsync-v2",
    category: "lipsync",
    displayName: "Sync Lipsync 2.0",
    falEndpointId: "fal-ai/sync-lipsync/v2",
    isWired: true,
    shortDescription:
      "Frame-accurate audio-to-video lipsync. Verified schema: video_url + audio_url in, video out. Used as an optional post-production step — never required.",
    capabilities: {
      supportsVideoInput: true,
      supportsAudioInput: true,
      syncModes: ["cut_off", "loop", "bounce", "silence", "remap"],
    },
    verifiedAt: "2026-07-10",
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export function getVideoModel(id: string): VideoModelConfig | undefined {
  return VIDEO_MODELS.find((m) => m.id === id);
}

export function getVoiceModel(id: string): VoiceModelConfig | undefined {
  return VOICE_MODELS.find((m) => m.id === id);
}

export function getLipsyncModel(id: string): LipsyncModelConfig | undefined {
  return LIPSYNC_MODELS.find((m) => m.id === id);
}

export interface RecommendationInput {
  hasStartImage: boolean;
  hasEndImage: boolean;
  referenceImageCount: number;
  hasDialogue: boolean;
  wantsFastPreview: boolean;
}

/**
 * Recommend a video model id from the current Studio inputs. UI shows this as
 * a suggestion chip; users can always override via Manual Model Selection.
 */
export function recommendVideoModel(input: RecommendationInput): {
  modelId: string;
  reason: string;
} {
  if (input.wantsFastPreview) {
    return {
      modelId: "seedance-2-fast-image-to-video",
      reason: "Fast Preview mode uses the low-latency Seedance 2 Fast tier.",
    };
  }
  if (input.referenceImageCount > 1 || input.hasDialogue) {
    return {
      modelId: "seedance-2-reference-to-video",
      reason:
        input.referenceImageCount > 1
          ? "Multiple character/scene references are supplied — Reference to Video honors all of them at once."
          : "Dialogue audio references are supported by the Reference to Video endpoint.",
    };
  }
  if (input.hasEndImage) {
    return {
      modelId: "seedance-2-image-to-video",
      reason: "Start + end frame continuity is supported by Seedance 2 Image to Video.",
    };
  }
  return {
    modelId: "seedance-2-image-to-video",
    reason: "Single starting image — standard Image to Video gives the best quality.",
  };
}

export const CONSISTENCY_STRENGTH_LABELS: Record<ConsistencyStrength, string> = {
  flexible: "Flexible",
  balanced: "Balanced",
  strong: "Strong",
  maximum: "Maximum",
};
