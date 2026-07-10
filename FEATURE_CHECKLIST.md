# Feature Checklist

Status as of the initial build. ✅ = working end-to-end. 🟡 = partially working / simplified.
⬜ = designed for but not implemented yet.

## Phase 1 — Foundation
- ✅ Next.js App Router + TypeScript + Tailwind + shadcn/ui, dark Monsta theme
- ✅ Supabase auth (email/password), session-aware proxy (middleware) redirecting signed-out users
- ✅ Supabase schema + RLS for every table (see `supabase/migrations`)
- ✅ Project CRUD (create, duplicate, archive, delete) with 9 project-type presets
- ✅ Drag-and-drop asset upload with role tagging (main frame, end frame, character/background/pose/style/prop/motion reference, reference video)
- ✅ Seedance 2 Image-to-Video, Fast, and Reference-to-Video adapters (real, inspected schemas)
- ✅ fal queue submit → poll → complete pipeline, with permanent copy into Supabase Storage
- ✅ Video preview player with approve/reject/favorite/download
- ✅ Generation History with search/filter (project, model, status, favorites, approved, failed)
- ✅ Server-side env validation, no keys ever sent to the browser

## Phase 2 — Hoop Squad System
- ✅ Character Library with the 6 preconfigured placeholder slots (G, Zo, Zach, Dash, Fifth Player, Coach)
- ✅ Character Lock toggle + 4 consistency strengths, feeding the deterministic prompt builder
- ✅ Scene/Environment Library (20 preconfigured categories) with a 9-image view set per location
- ✅ Scene Lock toggle + 4 consistency strengths
- ✅ Hoop Squad animation presets seeded as system prompt presets (Character Introduction, Dribble Sequence, Jump Shot, Layup, Defensive Stance, Rebound, Team Introduction, Coach Speech, Motion Comic, Celebration)
- ✅ Guided Prompt Builder (14 sections) + 9 deterministic transform buttons + 3-variation generator + multi-shot splitter
- ✅ Basketball motion guardrails (target basket, hand, poses, ball ownership, defender, camera/court direction) feeding the negative prompt
- ✅ Multiple takes per scene with side-by-side comparison, approval status, favorites
- ✅ Storyboard scene strip (add/duplicate/reorder-by-drag not yet wired — see below/delete/generate one/generate all)
- 🟡 Scene Templates: full CRUD and editable, but "Apply to Studio" one-click wiring isn't in the Studio UI yet (only the data + actions exist: `applySceneTemplateAction`)
- ⬜ Non-destructive crop/aspect-ratio positioning tool for uploaded images (uploads work; a dedicated crop UI is not yet built)
- ⬜ Click-to-mark target basket coordinates on the image itself (guardrail fields are text-based, not a click-to-mark canvas)

## Phase 3 — Voice & Audio
- ✅ ElevenLabs Eleven v3 via fal — real generation, preview-before-save, inline performance tags
- ✅ Character voice profiles (provider/model/voice id/description/emotion/speed/pronunciation/age tone)
- ✅ Voice cloning consent flow (checkbox + stored confirmation date + reference upload) — actual cloned-voice *generation* requires a voice-cloning model (F5-TTS/Qwen), which is defined in the model config but marked `isWired: false` pending schema inspection
- ✅ Dialogue Builder (speaker/text/emotion/pause/start time/performance note) with a relative timeline view and an over-budget warning driven by a words-per-minute estimate
- ✅ Generate all lines / regenerate a single line independently
- ✅ Audio Timeline (voiceover/music/SFX/ambience) with trim/volume/fade/mute/solo/loop/duck-under-dialogue
- ✅ Server-side FFmpeg mux ("Build Final Cut"): combines the selected take + audio tracks, honoring per-track volume/fade/mute/solo, a basic ducking pass, and a master limiter
- ✅ Captions generated directly from the dialogue script (no speech-to-text needed) with 5 style presets, exported as a `.vtt` file
- 🟡 Automatic ducking is volume-offset based (lower non-dialogue tracks by a fixed dB under dialogue), not a dynamic sidechain compressor
- ⬜ Burned-in/rendered captions onto the video itself (caption *data* generation works; drawing them into the frame via FFmpeg is a documented next step)
- ⬜ Dia TTS / F5-TTS / Qwen / Gemini TTS adapters — defined in `src/lib/fal/models.ts` with capability flags but not wired (schemas not yet inspected)

## Phase 4 — Advanced Studio
- ✅ Lip Sync (Sync Lipsync 2.0 via fal) — real, optional, produces an alternate take; mode selector (None / Basic / Dialogue / Narration)
- ✅ Cost controls: per-generation estimate shown before generating, editable pricing config in one file, spending threshold/limit fields in Settings
- ✅ Take comparison (side-by-side video compare in the Preview panel)
- ✅ Social aspect ratios exposed per model's real capabilities (no invented resolutions/durations)
- 🟡 Multi-Shot Mode: the prompt-builder "Turn Into Multi-Shot Sequence" button splits an idea into 3 connected beats, and every Seedance endpoint natively supports up to 15s in one call (per the inspected schema) — the FFmpeg stitching pipeline for the rare case a model *can't* do 15s natively is not built, since none of the wired models currently need it. `generation_mode` is modeled on `scenes` (`native_single` vs `multi_shot_composite`) for when that's needed.
- ⬜ Per-platform export presets (TikTok/Reel/Feed/Short/etc.) as one-click render jobs — aspect ratios are available, but there's no dedicated "Export" screen with title/end cards, logo overlay, or burned-in captions yet
- ⬜ First-frame/last-frame/thumbnail/metadata-JSON export buttons

## Not implemented (explicitly out of scope for this session)
- Direct ElevenLabs API integration (placeholder UI only, per spec) — currently ElevenLabs runs via fal
- A dedicated Export screen with title cards, end cards, and a Hoop Squad logo overlay
- Real-time collaboration / multi-user project sharing
