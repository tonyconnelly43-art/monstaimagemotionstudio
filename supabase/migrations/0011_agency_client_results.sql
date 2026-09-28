-- Agency Client Results: tracks each real-world marketing client's business
-- metrics (calls, conversions, average ticket) so Monsta Media can show them
-- a results dashboard and a "what-if" projection calculator. Manual entry for
-- now — CallRail / CRM integrations are a later phase; this just gives the
-- data a home to live in and a UI to see it in, reusable across every client.

create table if not exists public.agency_clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  industry text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists agency_clients_user_id_idx on public.agency_clients (user_id);

create table if not exists public.agency_client_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.agency_clients (id) on delete cascade,
  period_label text not null,
  period_start date not null,
  calls integer not null default 0,
  conversions integer not null default 0,
  avg_ticket numeric not null default 0,
  extra_metrics jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, period_start)
);
create index if not exists agency_client_metrics_client_id_idx on public.agency_client_metrics (client_id);

alter table public.agency_clients enable row level security;
alter table public.agency_client_metrics enable row level security;

do $$
declare
  t text;
begin
  for t in select unnest(array['agency_clients', 'agency_client_metrics'])
  loop
    execute format('create policy "%I owner select" on public.%I for select using (auth.uid() = user_id);', t, t);
    execute format('create policy "%I owner insert" on public.%I for insert with check (auth.uid() = user_id);', t, t);
    execute format('create policy "%I owner update" on public.%I for update using (auth.uid() = user_id);', t, t);
    execute format('create policy "%I owner delete" on public.%I for delete using (auth.uid() = user_id);', t, t);
  end loop;
end $$;

drop trigger if exists set_updated_at on public.agency_clients;
create trigger set_updated_at before update on public.agency_clients for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.agency_client_metrics;
create trigger set_updated_at before update on public.agency_client_metrics for each row execute function public.set_updated_at();

-- Belt-and-suspenders: explicit grants in case this runs before/without
-- migration 0004's "alter default privileges" having applied to new tables.
grant select, insert, update, delete on public.agency_clients to authenticated;
grant select, insert, update, delete on public.agency_client_metrics to authenticated;
