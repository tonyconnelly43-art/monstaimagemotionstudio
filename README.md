# Monsta Image to Video Studio

A premium, dark-themed creative studio for turning uploaded Hoop Squad cartoon artwork into
polished, consistent animated videos up to 15 seconds — with character/scene consistency
guardrails, a guided prompt builder, a voice & dialogue studio, and server-side FFmpeg mixing.

Read `IMPLEMENTATION_PLAN.md` for the architecture/phase plan and `FEATURE_CHECKLIST.md` for what
is fully working today vs. clearly labeled "coming soon."

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Supabase (auth/DB/storage) ·
fal.ai (`@fal-ai/client`) · FFmpeg (server-side, via `@ffmpeg-installer/ffmpeg` /
`@ffprobe-installer/ffprobe`, no system install required) · Vercel-compatible deployment.

## 1. Local development setup

### Prerequisites

- Node.js 20+
- A Supabase project (free tier is fine)
- A fal.ai account and API key

### Install

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

```env
FAL_KEY=                          # fal.ai API key — Dashboard → Keys
ANTHROPIC_API_KEY=                # Optional — Anthropic Console → API Keys. Only needed for the AI Cinematic Prompt writer in Prompt Builder.
NEXT_PUBLIC_SUPABASE_URL=         # Supabase project → Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase project → Settings → API
SUPABASE_SERVICE_ROLE_KEY=        # Supabase project → Settings → API (keep secret!)
WEBSITE_LEADS_DATABASE_URL=       # Optional — the monsta-media-site marketing website's own Neon DATABASE_URL (a separate project/database). Only needed for the Leads page.
```

### Set up the database

In the Supabase SQL editor, run the migrations in order:

```
supabase/migrations/0001_init.sql
supabase/migrations/0002_seed.sql
supabase/migrations/0003_storage.sql
supabase/migrations/0004_grants.sql
```

(Or, with the Supabase CLI linked to your project: `supabase db push`.)

`0004_grants.sql` matters even if you leave "Automatically expose new tables" **off** when creating
the project (the more secure default, and what this guide recommends) — that setting also controls
whether Postgres grants the `authenticated` role base table access. Without it, every query fails
with `permission denied for table ...` even though Row Level Security is configured correctly, since
RLS policies control *which rows* a role can see, not whether it can query the table at all.

This creates every table with Row Level Security, a trigger that gives each new signed-up user
their 6 preconfigured Hoop Squad character placeholder slots (G, Zo, Zach, Dash, Fifth Player,
Coach) and a starter "Main Rec Center Gym" location, the system Hoop Squad prompt presets, and the
three storage buckets (`assets`, `generations`, `exports`) with owner-scoped policies.

### Run

```bash
npm run dev
```

Visit `http://localhost:3000`, sign up, and you'll land in the Studio.

### Verify

```bash
npm run typecheck
npm run lint
npm run build
```

All three must pass with zero errors — this is enforced before every commit in this repo.

## 2. Deploying to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add the four environment variables from `.env.example` in the Vercel project settings
   (Production + Preview).
3. Deploy. No special build command is needed — `next build` is the default.
4. FFmpeg does not need to be installed on the Vercel machine: `@ffmpeg-installer/ffmpeg` and
   `@ffprobe-installer/ffprobe` bundle a static binary inside the npm package itself, and
   `next.config.ts` marks them (plus `fluent-ffmpeg`) as `serverExternalPackages` so the bundler
   leaves their native `require()` resolution alone. The final-cut and lip-sync routes run on the
   default Node.js runtime (not Edge) for this reason.
5. In Supabase, add your Vercel deployment URL to Authentication → URL Configuration → Redirect
   URLs so email confirmation / OAuth callbacks return to the right place.

## 3. Project structure

```
src/
  app/                    App Router routes, grouped under (app) for the authenticated shell
  components/             UI components, organized by feature (studio/, characters/, audio/, …)
  lib/
    supabase/              Browser, server, and service-role Supabase clients + upload helpers
    fal/                   Model config, adapters, queue helpers — see docs/FAL_INTEGRATION.md
    prompt/                Deterministic prompt-builder engine + transform buttons
    ffmpeg/                Server-side audio/video mux (Node runtime only)
    pricing/               Single editable cost-estimate config
    validation/             Zod schemas + file-upload validation
    data/                  Typed Supabase read helpers
    actions/               "use server" mutations (one file per feature)
  types/database.ts        Hand-written mirror of the SQL schema (see file header to regenerate)
supabase/migrations/       SQL schema, seed data, and storage bucket policies
docs/                       fal integration + error-handling documentation
```

## 4. Model adapter architecture

`src/lib/fal/models.ts` is the single source of truth for every fal model's ID, capabilities
(resolutions, durations, aspect ratios, reference limits), and wiring status. UI components read
capability flags from there — they never hard-code a duration list or endpoint ID. See
`docs/FAL_INTEGRATION.md` for the full write-up, including which schemas were actually inspected
(vs. defined-but-not-yet-wired) and the generation/polling/permanent-storage flow.

## 5. Error handling

See `docs/ERROR_HANDLING.md` — generation failures are translated into actionable messages, no
retry loop runs forever, every mutation re-checks ownership server-side regardless of what the
client sends, and secrets are never logged or returned to the browser.

## 6. What's done vs. what's next

See `FEATURE_CHECKLIST.md` for the authoritative, up-to-date list. Short version: Phases 1 and 2
(project/asset/character/scene workflow, Seedance generation, prompt builder, takes, history) are
fully functional. Phase 3 (voice, dialogue, audio mixing, captions) is functional for the wired
ElevenLabs model and FFmpeg mux, with voice-cloning generation and additional TTS providers defined
but intentionally left unwired pending their own schema inspection. Phase 4 (lip sync, cost
controls, take comparison) is functional; per-platform one-click export presets and burned-in
captions are the main documented gaps.
