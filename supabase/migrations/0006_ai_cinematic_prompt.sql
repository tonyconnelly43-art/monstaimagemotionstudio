-- Stores an AI-written, timestamped multi-shot cinematic prompt per scene
-- (an alternative to the deterministic guided-builder prompt) and which of
-- the two actually gets sent to the video model.

alter table public.scenes
  add column if not exists ai_written_prompt text,
  add column if not exists prompt_source text not null default 'guided'
    check (prompt_source in ('guided', 'ai_written'));
