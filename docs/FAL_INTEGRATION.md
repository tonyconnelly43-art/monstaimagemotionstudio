# fal.ai Integration

## Architecture

```
src/lib/fal/
  client.ts        Server-only @fal-ai/client singleton, configured from FAL_KEY
  models.ts        Single source of truth: model IDs + capability flags + pricing hooks
  queue.ts         Generic submit / status / result / cancel helpers, error explainer
  adapters/
    types.ts       Generic, model-agnostic param shapes used by the UI
    seedance.ts     Maps generic params → the exact Seedance 2.0 field names
    elevenlabs.ts   Maps generic params → the exact ElevenLabs-via-fal field names
```

UI components never import `@fal-ai/client` or hard-code an endpoint ID, duration, resolution,
or aspect ratio. They read `getVideoModel(id).capabilities` / `getVoiceModel(id).capabilities`
from `models.ts` and render only the controls that model actually supports. Swapping a model
version, or adding a new one, is a change in one file.

## Verified schemas (see `IMPLEMENTATION_PLAN.md` §3 for the inspection notes)

| Model | fal endpoint | Verified |
|---|---|---|
| Seedance 2 — Image to Video | `bytedance/seedance-2.0/image-to-video` | 2026-07-10 |
| Seedance 2 Fast — Image to Video | `bytedance/seedance-2.0/fast/image-to-video` | 2026-07-10 |
| Seedance 2 — Reference to Video | `bytedance/seedance-2.0/reference-to-video` | 2026-07-10 |
| ElevenLabs Eleven v3 (TTS) | `fal-ai/elevenlabs/tts/eleven-v3` | 2026-07-10 |
| ElevenLabs Voice Design (preview) | `fal-ai/elevenlabs/text-to-voice/design/eleven-v3` | 2026-08-10 |
| ElevenLabs Voice Design (save) | `fal-ai/elevenlabs/text-to-voice/create` | 2026-08-10 |
| Sync Lipsync 2.0 | `fal-ai/sync-lipsync/v2` | 2026-07-10 |

Models listed in `VOICE_MODELS` with `isWired: false` (Dia TTS, F5-TTS, Qwen Voice Cloning, Gemini
TTS) have placeholder endpoint IDs and capability guesses — **inspect their live schema at
`fal.ai/models/<id>/api` before setting `isWired: true`**, per the project's development rule.
Never guess field names, durations, resolutions, or output shapes.

## Generation flow

1. A server action (`src/lib/actions/generation.ts`, `voices.ts`, `dialogue.ts`, `lipsync.ts`)
   builds the model-specific input via an adapter and calls `submitToQueue()`.
2. The `generation_jobs` row is created first (`status: "queued"`), then updated with the fal
   `request_id` once the submit call succeeds (`status: "processing"`).
3. For video/lip-sync jobs, the client polls `GET /api/generation-jobs/[jobId]` (via
   `useGenerationJob`) every 4s, bounded to ~10 minutes of polling — never an endless loop.
4. On completion, the route downloads the fal-hosted file and re-uploads it into Supabase Storage
   (`generations` bucket) so the app never depends on a temporary fal URL remaining valid. If that
   copy fails, the fal URL is used as a fallback and the take is flagged via
   `permanent_storage_path = null`.
5. For quick jobs (TTS previews, single dialogue lines), `runQueueToCompletion()` polls in-process
   with a hard timeout instead of using the async route — acceptable because ElevenLabs generation
   is fast, and it avoids extra client-side plumbing for something that finishes in a couple of
   seconds.

## Cost estimates

fal.ai does not expose a pricing API. `src/lib/pricing/config.ts` is the single editable file with
per-second/per-minute estimates; every place a cost is shown to the user is labeled "Estimate" and
links back to that file's `notes` field. Update it as real invoiced costs come in — no other file
needs to change.
