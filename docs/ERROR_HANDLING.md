# Error Handling

## Generation failures

`src/lib/fal/queue.ts#explainFalError` maps raw fal/network errors to a message a non-technical
creator can act on (auth, rate limit, timeout, validation, network, unknown) instead of a bare
"Generation failed." Every failure is written to `generation_jobs.error_message` /
`error_code` so it's visible later in Generation History, not just in a toast that disappears.

## No endless retries

- The client-side job poller (`useGenerationJob`) stops after 150 polls (~10 minutes) or 5
  consecutive network failures and surfaces a clear message instead of polling forever.
- `runQueueToCompletion` (used for fast TTS previews) has a hard `timeoutMs` (default 45s) and
  throws rather than looping indefinitely.
- The generation rate limiter (`GENERATION_RATE_LIMIT` in `src/lib/validation/generation.ts`)
  caps requests per user per rolling hour, checked against `generation_jobs.created_at` — a
  real, persisted counter rather than an in-memory one that would reset on every serverless
  invocation.

## Ownership & security

- Every table has RLS policies scoped to `auth.uid() = user_id` (see
  `supabase/migrations/0001_init.sql`); server actions additionally re-check `auth.getUser()`
  before any mutation, so a forged ID in a request body still can't touch another user's row.
- File uploads are validated by type and size before the browser is allowed to write to Storage
  (`src/lib/validation/upload.ts`), and storage paths are prefixed with the user's own ID so RLS
  storage policies can enforce ownership from the path alone.
- `src/lib/env.ts#getServerEnv()` throws a clear, specific error ("FAL_KEY is required", etc.) the
  first time a server action needs an unset environment variable, rather than a generic crash deep
  in a third-party client.
- Errors are logged server-side with `console.error`-style context in the route handlers; the
  service-role key and `FAL_KEY` are never included in any response body or client-visible log.

## FFmpeg mixing

`buildFinalCutAction` catches errors from the FFmpeg pipeline and returns a scoped message
("FFmpeg could not build the final cut: …") rather than crashing the request. If the rendered
file uploads successfully but the Storage write fails, the user is told the render succeeded but
the save failed, instead of a silent loss.
