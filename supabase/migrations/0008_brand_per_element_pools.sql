-- Splits the Brand Generator's reference pool and style rules out per
-- element type (Mascot / Wordmark / Background) instead of one shared pool
-- for the whole brand project — references and custom generation rules
-- uploaded for the mascot no longer bleed into wordmark/background generations.

alter table public.brand_references
  add column if not exists element_type text not null default 'mascot'
    check (element_type in ('mascot', 'wordmark', 'background'));

alter table public.brand_projects
  add column if not exists mascot_rules text,
  add column if not exists wordmark_rules text,
  add column if not exists background_rules text;
