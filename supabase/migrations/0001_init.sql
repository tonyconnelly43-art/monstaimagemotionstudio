-- Monsta Image to Video Studio — initial schema
-- Safe to run once against a fresh Supabase project (Postgres 15+).
-- All tables use RLS "owner only" policies keyed off auth.uid().

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users, created via trigger on signup)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  insert into public.app_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  project_type text not null default 'custom'
    check (project_type in (
      'character_introduction', 'basketball_action', 'dialogue_scene', 'social_media_post',
      'cinematic_scene', 'motion_comic', 'story_episode', 'logo_title_animation', 'custom'
    )),
  description text,
  thumbnail_url text,
  status text not null default 'active' check (status in ('active', 'archived', 'deleted')),
  target_aspect_ratio text not null default '9:16',
  target_platform text,
  is_demo boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists projects_status_idx on public.projects (status);

-- ---------------------------------------------------------------------------
-- characters (Hoop Squad character library)
-- ---------------------------------------------------------------------------
create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slot_key text, -- stable key for preconfigured slots e.g. 'g', 'zo', 'zach', 'dash', 'fifth', 'coach'
  name text not null,
  main_image_url text,
  front_view_url text,
  side_view_url text,
  back_view_url text,
  description text,
  personality text,
  basketball_position text,
  height_notes text,
  body_proportions text,
  skin_tone text,
  hair text,
  clothing_details text,
  jersey_number text,
  approved_color_palette text,
  negative_instructions text,
  default_voice_id uuid,
  voice_settings jsonb not null default '{}'::jsonb,
  notes text,
  is_placeholder boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slot_key)
);
create index if not exists characters_user_id_idx on public.characters (user_id);

-- ---------------------------------------------------------------------------
-- character_references (alternate poses, expressions, uniforms, etc.)
-- ---------------------------------------------------------------------------
create table if not exists public.character_references (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  reference_type text not null default 'pose'
    check (reference_type in (
      'pose', 'facial_expression', 'uniform', 'prop', 'style', 'motion', 'other'
    )),
  label text,
  image_url text not null,
  created_at timestamptz not null default now()
);
create index if not exists character_references_character_id_idx on public.character_references (character_id);

-- ---------------------------------------------------------------------------
-- hoop_squad_scenes (Scene / Environment Library)
-- ---------------------------------------------------------------------------
create table if not exists public.hoop_squad_scenes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null default 'custom'
    check (category in (
      'main_rec_center_gym', 'basketball_court', 'gym_bleachers', 'team_bench', 'locker_room',
      'coachs_office', 'rec_center_hallway', 'trophy_case_area', 'snack_bar', 'rec_center_entrance',
      'outdoor_basketball_court', 'neighborhood_street', 'school', 'classroom', 'playground',
      'character_bedrooms', 'character_homes', 'tournament_gym', 'championship_court', 'custom'
    )),
  main_image_url text,
  wide_establishing_url text,
  left_side_view_url text,
  right_side_view_url text,
  close_up_background_url text,
  entrance_view_url text,
  daytime_version_url text,
  evening_version_url text,
  empty_version_url text,
  approved_props text,
  lighting_description text,
  color_palette text,
  environment_description text,
  required_objects text,
  forbidden_objects text,
  character_placement_zones jsonb not null default '[]'::jsonb,
  basketball_hoop_location jsonb,
  camera_direction_notes text,
  consistency_instructions text,
  negative_instructions text,
  ambience_sound_tags text[] not null default '{}',
  is_placeholder boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists hoop_squad_scenes_user_id_idx on public.hoop_squad_scenes (user_id);

-- ---------------------------------------------------------------------------
-- scene_references (extra view-set images tied to a hoop_squad_scenes location)
-- ---------------------------------------------------------------------------
create table if not exists public.scene_references (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  hoop_squad_scene_id uuid not null references public.hoop_squad_scenes (id) on delete cascade,
  view_label text not null,
  image_url text not null,
  created_at timestamptz not null default now()
);
create index if not exists scene_references_scene_id_idx on public.scene_references (hoop_squad_scene_id);

-- ---------------------------------------------------------------------------
-- scene_templates (reusable combos of environment + characters + settings)
-- ---------------------------------------------------------------------------
create table if not exists public.scene_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  hoop_squad_scene_id uuid references public.hoop_squad_scenes (id) on delete set null,
  camera_angle text,
  character_ids uuid[] not null default '{}',
  character_placements jsonb not null default '{}'::jsonb,
  props text[] not null default '{}',
  lighting text,
  aspect_ratio text,
  animation_preset text,
  voice_settings jsonb not null default '{}'::jsonb,
  sound_effects text[] not null default '{}',
  prompt_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists scene_templates_user_id_idx on public.scene_templates (user_id);

-- ---------------------------------------------------------------------------
-- scenes (a storyboard beat inside a project)
-- ---------------------------------------------------------------------------
create table if not exists public.scenes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  scene_number integer not null default 1,
  name text not null default 'Untitled Scene',
  hoop_squad_scene_id uuid references public.hoop_squad_scenes (id) on delete set null,
  camera_angle text,
  time_of_day text,
  character_ids uuid[] not null default '{}',
  character_placements jsonb not null default '{}'::jsonb,
  hoop_target jsonb,
  prompt text,
  negative_prompt text,
  casual_idea text,
  prompt_sections jsonb not null default '{}'::jsonb,
  duration_seconds integer not null default 5,
  aspect_ratio text not null default '9:16',
  video_model_id text,
  character_lock boolean not null default true,
  character_lock_strength text not null default 'balanced'
    check (character_lock_strength in ('flexible', 'balanced', 'strong', 'maximum')),
  scene_lock boolean not null default true,
  scene_lock_strength text not null default 'balanced'
    check (scene_lock_strength in ('flexible', 'balanced', 'strong', 'maximum')),
  voice_settings jsonb not null default '{}'::jsonb,
  generation_mode text not null default 'native_single'
    check (generation_mode in ('native_single', 'multi_shot_composite')),
  selected_take_id uuid,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists scenes_project_id_idx on public.scenes (project_id);
create index if not exists scenes_user_id_idx on public.scenes (user_id);

-- ---------------------------------------------------------------------------
-- uploaded_assets (all drag-and-drop uploads: images, ref video, frames)
-- ---------------------------------------------------------------------------
create table if not exists public.uploaded_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  scene_id uuid references public.scenes (id) on delete cascade,
  character_id uuid references public.characters (id) on delete cascade,
  hoop_squad_scene_id uuid references public.hoop_squad_scenes (id) on delete cascade,
  storage_path text not null,
  public_url text,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null,
  role text not null default 'style_reference'
    check (role in (
      'main_starting_frame', 'ending_frame', 'character_reference', 'background_reference',
      'pose_reference', 'style_reference', 'prop_reference', 'motion_reference', 'reference_video'
    )),
  crop_settings jsonb,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);
create index if not exists uploaded_assets_project_id_idx on public.uploaded_assets (project_id);
create index if not exists uploaded_assets_scene_id_idx on public.uploaded_assets (scene_id);
create index if not exists uploaded_assets_user_id_idx on public.uploaded_assets (user_id);

-- ---------------------------------------------------------------------------
-- voices (character voice profiles / saved voices)
-- ---------------------------------------------------------------------------
create table if not exists public.voices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  character_id uuid references public.characters (id) on delete set null,
  name text not null,
  provider text not null default 'fal' check (provider in ('fal', 'elevenlabs_direct', 'uploaded')),
  model_id text,
  voice_id text,
  reference_audio_url text,
  description text,
  default_emotion text,
  default_speed numeric,
  pronunciation_guide text,
  age_appropriate_tone text,
  is_cloned boolean not null default false,
  consent_confirmed boolean not null default false,
  consent_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists voices_user_id_idx on public.voices (user_id);
create index if not exists voices_character_id_idx on public.voices (character_id);

alter table public.characters
  add constraint characters_default_voice_fk foreign key (default_voice_id)
  references public.voices (id) on delete set null;

-- ---------------------------------------------------------------------------
-- voice_samples (preview / audition takes for a voice, pre-save)
-- ---------------------------------------------------------------------------
create table if not exists public.voice_samples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  voice_id uuid references public.voices (id) on delete cascade,
  sample_text text not null,
  audio_url text,
  generation_job_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists voice_samples_voice_id_idx on public.voice_samples (voice_id);

-- ---------------------------------------------------------------------------
-- dialogue_lines (dialogue builder, per-scene)
-- ---------------------------------------------------------------------------
create table if not exists public.dialogue_lines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scene_id uuid not null references public.scenes (id) on delete cascade,
  speaker_character_id uuid references public.characters (id) on delete set null,
  line_order integer not null default 0,
  text_content text not null,
  emotion text,
  performance_note text,
  pause_after_ms integer not null default 300,
  start_time_ms integer not null default 0,
  estimated_duration_ms integer,
  reaction_character_id uuid references public.characters (id) on delete set null,
  audio_url text,
  generation_job_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists dialogue_lines_scene_id_idx on public.dialogue_lines (scene_id);

-- ---------------------------------------------------------------------------
-- model_configs (editable capability/metadata mirror of src/lib/fal/models.ts)
-- ---------------------------------------------------------------------------
create table if not exists public.model_configs (
  id text primary key, -- e.g. 'seedance-2-image-to-video'
  category text not null check (category in ('video', 'voice', 'lipsync')),
  fal_endpoint_id text not null,
  display_name text not null,
  capabilities jsonb not null default '{}'::jsonb,
  pricing jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- generation_jobs (one fal queue submission)
-- ---------------------------------------------------------------------------
create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  scene_id uuid references public.scenes (id) on delete cascade,
  job_type text not null default 'video' check (job_type in ('video', 'voice', 'lipsync', 'multi_shot_composite')),
  model_id text not null,
  fal_request_id text,
  status text not null default 'queued'
    check (status in ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  input_payload jsonb not null default '{}'::jsonb,
  error_message text,
  error_code text,
  retry_count integer not null default 0,
  cost_estimate numeric,
  cost_estimate_is_exact boolean not null default false,
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists generation_jobs_project_id_idx on public.generation_jobs (project_id);
create index if not exists generation_jobs_scene_id_idx on public.generation_jobs (scene_id);
create index if not exists generation_jobs_user_id_idx on public.generation_jobs (user_id);
create index if not exists generation_jobs_status_idx on public.generation_jobs (status);
create index if not exists generation_jobs_fal_request_id_idx on public.generation_jobs (fal_request_id);

-- ---------------------------------------------------------------------------
-- generation_takes (a completed result of a generation_job, scene can have many)
-- ---------------------------------------------------------------------------
create table if not exists public.generation_takes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scene_id uuid not null references public.scenes (id) on delete cascade,
  generation_job_id uuid not null references public.generation_jobs (id) on delete cascade,
  take_number integer not null default 1,
  prompt_used text,
  model_id text not null,
  input_image_urls text[] not null default '{}',
  seed bigint,
  duration_seconds integer,
  aspect_ratio text,
  cost_estimate numeric,
  cost_estimate_is_exact boolean not null default false,
  output_url text,
  permanent_storage_path text,
  thumbnail_url text,
  is_favorite boolean not null default false,
  approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected')),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists generation_takes_scene_id_idx on public.generation_takes (scene_id);
create index if not exists generation_takes_job_id_idx on public.generation_takes (generation_job_id);

alter table public.scenes
  add constraint scenes_selected_take_fk foreign key (selected_take_id)
  references public.generation_takes (id) on delete set null;

-- ---------------------------------------------------------------------------
-- audio_tracks (timeline items: music, sfx, voiceover, ambience)
-- ---------------------------------------------------------------------------
create table if not exists public.audio_tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  scene_id uuid not null references public.scenes (id) on delete cascade,
  track_type text not null default 'sfx'
    check (track_type in (
      'voiceover_generated', 'voiceover_uploaded', 'music', 'sfx', 'ambience'
    )),
  label text,
  source_url text not null,
  start_ms integer not null default 0,
  trim_start_ms integer not null default 0,
  trim_end_ms integer,
  volume_db numeric not null default 0,
  fade_in_ms integer not null default 0,
  fade_out_ms integer not null default 0,
  is_muted boolean not null default false,
  is_solo boolean not null default false,
  is_looped boolean not null default false,
  duck_under_dialogue boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists audio_tracks_scene_id_idx on public.audio_tracks (scene_id);

-- ---------------------------------------------------------------------------
-- prompt_presets (Hoop Squad animation presets + user-saved prompt templates)
-- ---------------------------------------------------------------------------
create table if not exists public.prompt_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  is_system_default boolean not null default false,
  name text not null,
  category text not null default 'custom',
  description text,
  prompt_sections jsonb not null default '{}'::jsonb,
  negative_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists prompt_presets_user_id_idx on public.prompt_presets (user_id);

-- ---------------------------------------------------------------------------
-- app_settings (one row per user)
-- ---------------------------------------------------------------------------
create table if not exists public.app_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  default_video_model_id text,
  default_voice_model_id text,
  default_aspect_ratio text not null default '9:16',
  default_output_quality text not null default '720p',
  hoop_squad_style_instructions text not null default
    'Preserve the exact approved Hoop Squad cartoon illustration style. Keep all characters age-appropriate, expressive, friendly, energetic, and recognizable. Maintain the original proportions, linework, colors, faces, hair, uniforms, and jersey numbers. Movement should feel like polished children''s animation rather than photorealistic footage. Basketball actions should be readable, believable, and easy to follow. Maintain the original rec-center environment and do not introduce unrelated logos, brands, characters, objects, or text.',
  global_negative_prompt text not null default
    'Do not redesign the character. Do not change the face, skin tone, hairstyle, body proportions, uniform, jersey number, shoes, age, illustration style, or color palette. No photorealism. No extra limbs, fingers, basketballs, players, baskets, spectators, text, logos, watermarks, or duplicate characters. No warped hands, melting faces, floating objects, sliding feet, disappearing ball, changing background, incorrect basketball target, or sudden camera-angle reversal.',
  spending_warning_threshold numeric,
  daily_spending_limit numeric,
  auto_save boolean not null default true,
  auto_download boolean not null default false,
  default_export_location text,
  advanced_mode boolean not null default false,
  elevenlabs_direct_api_key_ciphertext text,
  developer_diagnostics boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- generation_rate_limits (per-user sliding-window counter for API routes)
-- ---------------------------------------------------------------------------
create table if not exists public.generation_rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  window_start timestamptz not null default now(),
  request_count integer not null default 0,
  primary key (user_id, window_start)
);

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'profiles','projects','characters','hoop_squad_scenes','scene_templates','scenes',
    'voices','dialogue_lines','model_configs','generation_jobs','audio_tracks',
    'prompt_presets','app_settings'
  ])
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I; create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.characters enable row level security;
alter table public.character_references enable row level security;
alter table public.hoop_squad_scenes enable row level security;
alter table public.scene_references enable row level security;
alter table public.scene_templates enable row level security;
alter table public.scenes enable row level security;
alter table public.uploaded_assets enable row level security;
alter table public.voices enable row level security;
alter table public.voice_samples enable row level security;
alter table public.dialogue_lines enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.generation_takes enable row level security;
alter table public.audio_tracks enable row level security;
alter table public.prompt_presets enable row level security;
alter table public.app_settings enable row level security;
alter table public.generation_rate_limits enable row level security;
alter table public.model_configs enable row level security;

create policy "profiles owner select" on public.profiles for select using (auth.uid() = id);
create policy "profiles owner update" on public.profiles for update using (auth.uid() = id);

create policy "model_configs read all authenticated" on public.model_configs
  for select to authenticated using (true);

do $$
declare
  t text;
begin
  for t in select unnest(array[
    'projects','characters','character_references','hoop_squad_scenes','scene_references',
    'scene_templates','scenes','uploaded_assets','voices','voice_samples','dialogue_lines',
    'generation_jobs','generation_takes','audio_tracks','app_settings','generation_rate_limits'
  ])
  loop
    execute format('create policy "%I owner select" on public.%I for select using (auth.uid() = user_id);', t, t);
    execute format('create policy "%I owner insert" on public.%I for insert with check (auth.uid() = user_id);', t, t);
    execute format('create policy "%I owner update" on public.%I for update using (auth.uid() = user_id);', t, t);
    execute format('create policy "%I owner delete" on public.%I for delete using (auth.uid() = user_id);', t, t);
  end loop;
end $$;

-- prompt_presets: system defaults are readable by everyone, user rows owner-only
create policy "prompt_presets system read" on public.prompt_presets
  for select to authenticated using (is_system_default = true or auth.uid() = user_id);
create policy "prompt_presets owner insert" on public.prompt_presets
  for insert with check (auth.uid() = user_id);
create policy "prompt_presets owner update" on public.prompt_presets
  for update using (auth.uid() = user_id and is_system_default = false);
create policy "prompt_presets owner delete" on public.prompt_presets
  for delete using (auth.uid() = user_id and is_system_default = false);

-- trigger: create profile + default settings row on signup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
