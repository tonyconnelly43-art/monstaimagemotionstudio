export interface VideoGenerationParams {
  modelId: string;
  prompt: string;
  /** Main starting frame (image-to-video endpoints). */
  imageUrl?: string;
  /** Final frame for start/end continuity (only honored when capabilities.supportsEndFrame). */
  endImageUrl?: string;
  /** Character/scene reference images (only honored on reference-to-video endpoints). */
  referenceImageUrls?: string[];
  referenceVideoUrls?: string[];
  referenceAudioUrls?: string[];
  resolution?: string;
  duration?: "auto" | number;
  aspectRatio?: string;
  generateAudio?: boolean;
  bitrateMode?: string;
}

export interface VoiceGenerationParams {
  modelId: string;
  text: string;
  voice?: string;
  stability?: number;
  languageCode?: string;
  timestamps?: boolean;
}

export interface FalFileResult {
  url: string;
  content_type?: string;
  file_name?: string;
  file_size?: number;
}
