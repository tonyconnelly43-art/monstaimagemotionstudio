-- Moves the "automatically added to every generated prompt" style profile
-- from a single global-per-account setting to per-project columns, so
-- different shows/brands on the same account each keep their own
-- illustration style instead of one cartoon's style bleeding into every
-- other project (Hoop Squad's style was previously applied to literally
-- every generation on the account, sports or not, Hoop Squad or not).

alter table public.projects
  add column if not exists style_instructions text,
  add column if not exists basketball_style_instructions text,
  add column if not exists everyday_style_instructions text;

-- One-time backfill: every existing project inherits whatever the account's
-- global style profile already was, so existing work (Hoop Squad) keeps
-- generating exactly as before. New projects created after this migration
-- start blank on purpose — a brand-new show shouldn't silently inherit
-- another show's art style.
update public.projects p
set
  style_instructions = s.hoop_squad_style_instructions,
  basketball_style_instructions = s.basketball_style_instructions,
  everyday_style_instructions = s.everyday_style_instructions
from public.app_settings s
where s.user_id = p.user_id;

alter table public.app_settings
  drop column if exists hoop_squad_style_instructions,
  drop column if exists basketball_style_instructions,
  drop column if exists everyday_style_instructions;
