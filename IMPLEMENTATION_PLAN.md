# Monsta Image to Video Studio — Implementation Plan

## 1. Purpose

A premium, dark-themed creative studio (not a generic "AI video generator") purpose-built to turn
uploaded Hoop Squad cartoon artwork into consistent, polished animated videos up to 15 seconds,
with character/scene consistency guardrails, a guided prompt builder, a voice/dialogue studio, and
FFmpeg-based audio/video assembly.

## 2. Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 15 (App Router), TypeScript, React 19 |
| Styling / UI | Tailwind CSS + shadcn/ui (Radix primitives) |
| Auth / DB / Storage | Supabase (Postgres, Auth, Storage, RLS) |
| Video / audio generation | fal.ai via `@fal-ai/client`, server-only |
| Media assembly | fluent-ffmpeg + system ffmpeg binary (server routes / Node runtime) |
| Deployment | Vercel-compatible (Node runtime routes for ffmpeg, no Edge runtime on media routes) |

All fal + Supabase service-role calls happen in server actions / route handlers only. The browser
never sees `FAL_KEY` or `SUPABASE_SERVICE_ROLE_KEY`.

## 3. Model inspection notes (July 2026)

Inspected live at `fal.ai/models/.../api` before writing `lib/fal/models.ts`:

- **`bytedance/seedance-2.0/image-to-video`** — `prompt`, `image_url` (required), optional
  `end_image_url`, `resolution` (`480p|720p|1080p|4k`, default `720p`), `duration`
  (`auto|4..15`, default `auto`), `aspect_ratio` (`auto|21:9|16:9|4:3|1:1|3:4|9:16`),
  `generate_audio` (bool, default true), `bitrate_mode` (`standard|high`). Output: `video` (File),
  `seed`. Native single-shot generation up to 15s.
- **`bytedance/seedance-2.0/fast/image-to-video`** — same shape, `resolution` limited to
  `480p|720p` (no 1080p/4k), lower latency/cost. Good "Fast Preview" tier.
- **`bytedance/seedance-2.0/reference-to-video`** — `prompt` required; up to 9 `image_urls`,
  3 `video_urls`, 3 `audio_urls` (combined ≤ 12 files); same `resolution` / `duration` /
  `aspect_ratio` / `generate_audio` / `bitrate_mode` fields. Best for multi-reference character +
  scene consistency.
- **`fal-ai/elevenlabs/tts/eleven-v3`** — `text` required, `voice` (default "Rachel"),
  `stability` (0-1, default 0.5), `timestamps` (bool), `language_code`,
  `apply_text_normalization` (`auto|on|off`). Output: `audio` (File), optional `timestamps`.

Because every one of these models natively supports up to 15s, Multi-Shot Mode is implemented as
an **opt-in fallback** (for models that don't support 15s natively, or when the creator explicitly
wants a multi-beat sequence) rather than the default path — the config layer marks
`maxNativeDurationSeconds` per model and the Studio UI only offers Multi-Shot when the request
exceeds that number or the user picks "Turn Into Multi-Shot Sequence".

Model IDs, capability flags, and field lists live in one file
(`src/lib/fal/models.ts`) so future model swaps do not touch UI components — components read
capability flags (`supportsEndFrame`, `resolutions`, `durations`, etc.), never hard-coded values.

## 4. Data model (Supabase)

Tables (see `supabase/migrations/0001_init.sql`): `profiles`, `projects`, `scenes`, `characters`,
`character_references`, `hoop_squad_scenes` (environment library), `scene_references`,
`scene_templates`, `voices`, `voice_samples`, `dialogue_lines`, `uploaded_assets`,
`generation_jobs`, `generation_takes`, `audio_tracks`, `prompt_presets`, `model_configs`,
`app_settings`. All tables carry `user_id`, `created_at`, `updated_at`, RLS "owner only" policies,
and FK/indexes on `project_id` / `scene_id` / `user_id`.

## 5. Build phases (this repo)

**Phase 1 — Foundation (this session, fully functional):**
Next.js scaffold, auth, Supabase schema, project CRUD, drag-and-drop asset upload with role
tagging, Seedance image-to-video + fast + reference-to-video adapters, fal queue submit/poll route,
generation history, video preview, secure env validation.

**Phase 2 — Hoop Squad system (this session):**
Character Library with preconfigured G/Zo/Zach/Dash/5th player/Coach placeholder slots, Character
Lock + consistency strength, Scene/Environment Library with preconfigured categories + view sets,
Scene Lock, Hoop Squad animation presets, basketball motion guardrails (hoop marker, negative
instructions), guided Prompt Builder (deterministic template engine), multiple takes, storyboard.

**Phase 3 — Voice & audio (scaffolded this session, generation wired for TTS, mixing UI present,
FFmpeg mixing route implemented for basic mux; advanced ducking/limiter documented as next step):**
Voice Studio adapters (ElevenLabs-via-fal wired; Dia/F5/Qwen slots defined but not yet wired —
clearly labeled), character voice profiles, dialogue builder with timeline, audio track model,
caption generation from existing script text.

**Phase 4 — Advanced studio (data model + UI scaffolding this session, marked "Coming Soon" where
generation isn't wired yet):** multi-shot composite pipeline, lip-sync adapter slot, cost controls,
social export presets, take comparison.

Every screen for unfinished functionality is visibly labeled (badge: "Coming Soon" / "Phase 3" /
"Phase 4") rather than faked — see `FEATURE_CHECKLIST.md` for the authoritative done/not-done list
kept up to date as of the last commit.

## 6. Directory layout

```
src/
  app/                     (App Router routes + server actions)
  components/              (shared + shadcn/ui components)
  lib/
    supabase/               (server + browser clients, middleware)
    fal/                    (client, models.ts config, adapters/)
    prompt/                 (deterministic prompt builder engine)
    ffmpeg/                 (server-side mux/mix helpers)
    pricing/                (single cost-config file)
    validation/             (zod schemas, file validation)
supabase/migrations/
```

## 7. Security

Zod-validated inputs on every route, Supabase RLS on every table, signed/short-lived upload paths
under `user_id/project_id/...`, file-type + size allowlist, per-user rate limiting on generation
routes (in-memory + DB-backed counter), no raw API keys ever returned to the client, ownership
checks on every mutation (`user_id = auth.uid()`).

## 8. Definition of done for this session

`npm run typecheck`, `npm run lint`, `npm run build` all pass with zero errors before final commit.
