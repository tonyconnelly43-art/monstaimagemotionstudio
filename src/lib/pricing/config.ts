/**
 * Single source of truth for cost estimation. fal.ai does not publish a
 * queryable pricing API, so these are editable estimates — always surfaced
 * to the user labeled "Estimated cost" rather than a guaranteed price.
 * Update this file (or the `model_configs.pricing` DB column, which takes
 * precedence when present) as real invoiced costs come in.
 */

export interface PricingEntry {
  /** USD per second of generated output, when the model bills by duration. */
  perSecondUsd?: number;
  /** USD flat fee per generation, when the model bills per call. */
  perGenerationUsd?: number;
  /** USD per minute of audio, for TTS/lipsync models billed that way. */
  perMinuteUsd?: number;
  notes: string;
}

export const VIDEO_MODEL_PRICING: Record<string, PricingEntry> = {
  "seedance-2-image-to-video": {
    perSecondUsd: 0.15,
    notes: "Estimate only — fal does not expose a pricing API. Verify against your fal invoice.",
  },
  "seedance-2-fast-image-to-video": {
    perSecondUsd: 0.08,
    notes: "Estimate only — Fast tier is priced lower than standard/pro.",
  },
  "seedance-2-reference-to-video": {
    perSecondUsd: 0.18,
    notes: "Estimate only — reference-to-video may cost more due to multi-input processing.",
  },
};

export const VOICE_MODEL_PRICING: Record<string, PricingEntry> = {
  "elevenlabs-eleven-v3": {
    perMinuteUsd: 0.18,
    notes: "Estimate only — ElevenLabs-via-fal pricing varies by plan.",
  },
};

export const LIPSYNC_MODEL_PRICING: Record<string, PricingEntry> = {
  "sync-lipsync-v2": {
    perMinuteUsd: 3,
    notes: "Published fal rate at time of writing for Sync Lipsync 2.0.",
  },
};

export function estimateVideoCost(modelId: string, durationSeconds: number): {
  amountUsd: number | null;
  isExact: boolean;
  label: string;
} {
  const entry = VIDEO_MODEL_PRICING[modelId];
  if (!entry?.perSecondUsd) {
    return { amountUsd: null, isExact: false, label: "Pricing not configured for this model." };
  }
  return {
    amountUsd: Math.round(entry.perSecondUsd * durationSeconds * 100) / 100,
    isExact: false,
    label: `Estimate: ~$${(entry.perSecondUsd * durationSeconds).toFixed(2)} (${entry.notes})`,
  };
}

export function estimateVoiceCost(modelId: string, estimatedSeconds: number): {
  amountUsd: number | null;
  isExact: boolean;
  label: string;
} {
  const entry = VOICE_MODEL_PRICING[modelId];
  if (!entry?.perMinuteUsd) {
    return { amountUsd: null, isExact: false, label: "Pricing not configured for this model." };
  }
  const amount = (entry.perMinuteUsd * estimatedSeconds) / 60;
  return {
    amountUsd: Math.round(amount * 100) / 100,
    isExact: false,
    label: `Estimate: ~$${amount.toFixed(2)} (${entry.notes})`,
  };
}
