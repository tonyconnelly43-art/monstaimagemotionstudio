export const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
export const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/webm", "audio/ogg"];
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20MB
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200MB
export const MAX_AUDIO_BYTES = 50 * 1024 * 1024; // 50MB

export function validateUploadFile(file: File): { ok: true } | { ok: false; message: string } {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);
  if (!isImage && !isVideo) {
    return { ok: false, message: "Only PNG, JPG, WEBP images or MP4/MOV/WEBM video files are supported." };
  }
  if (isImage && file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: "Images must be smaller than 20MB." };
  }
  if (isVideo && file.size > MAX_VIDEO_BYTES) {
    return { ok: false, message: "Reference videos must be smaller than 200MB." };
  }
  return { ok: true };
}

export function validateAudioUploadFile(file: File): { ok: true } | { ok: false; message: string } {
  if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
    return { ok: false, message: "Only MP3, WAV, M4A, WEBM, or OGG audio files are supported." };
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return { ok: false, message: "Audio files must be smaller than 50MB." };
  }
  return { ok: true };
}

/** Strips path separators and unsafe characters so storage paths stay predictable. */
export function safeFileName(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/_+/g, "_");
  return cleaned.slice(-140);
}
