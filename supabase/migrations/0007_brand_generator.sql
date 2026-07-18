-- Home Service Brand Generator: a separate creative pipeline for building a
-- new company's brand (Mascot, Wordmark, Background) that reuses the same
-- Nano Banana Pro image generation, RLS "owner only" conventions, and
-- "assets" storage bucket as the rest of the app.

create table if not exists public.brand_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  company_info text,
  mascot_favorite_url text,
  wordmark_favorite_url text,
  background_favorite_url text,
  final_brand_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists brand_projects_user_id_idx on public.brand_projects (user_id);

create table if not exists public.brand_references (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_project_id uuid not null references public.brand_projects (id) on delete cascade,
  image_url text not null,
  label text,
  created_at timestamptz not null default now()
);
create index if not exists brand_references_project_id_idx on public.brand_references (brand_project_id);

create table if not exists public.brand_generation_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_project_id uuid not null references public.brand_projects (id) on delete cascade,
  element_type text not null check (element_type in ('mascot', 'wordmark', 'background')),
  prompt text not null,
  image_urls text[] not null,
  created_at timestamptz not null default now()
);
create index if not exists brand_batches_project_id_idx on public.brand_generation_batches (brand_project_id);

alter table public.brand_projects enable row level security;
alter table public.brand_references enable row level security;
alter table public.brand_generation_batches enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array['brand_projects', 'brand_references', 'brand_generation_batches'])
  loop
    execute format('create policy "%I owner select" on public.%I for select using (auth.uid() = user_id);', t, t);
    execute format('create policy "%I owner insert" on public.%I for insert with check (auth.uid() = user_id);', t, t);
    execute format('create policy "%I owner update" on public.%I for update using (auth.uid() = user_id);', t, t);
    execute format('create policy "%I owner delete" on public.%I for delete using (auth.uid() = user_id);', t, t);
  end loop;
end $$;

drop trigger if exists set_updated_at on public.brand_projects;
create trigger set_updated_at before update on public.brand_projects for each row execute function public.set_updated_at();

-- Belt-and-suspenders: explicit grants in case this runs before/without
-- migration 0004's "alter default privileges" having applied to new tables.
grant select, insert, update, delete on public.brand_projects to authenticated;
grant select, insert, update, delete on public.brand_references to authenticated;
grant select, insert, update, delete on public.brand_generation_batches to authenticated;
