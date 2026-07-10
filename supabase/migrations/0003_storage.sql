-- Storage buckets + RLS policies. Uploads live under a per-user prefix
-- (e.g. "{auth.uid()}/projects/{project_id}/...") so policies can check
-- ownership from the path itself without an extra lookup table.

insert into storage.buckets (id, name, public)
values
  ('assets', 'assets', true),        -- source uploads: images, ref video, frames
  ('generations', 'generations', true), -- permanent copies of completed video/audio takes
  ('exports', 'exports', true)       -- rendered final-cut exports
on conflict (id) do nothing;

create policy "assets owner read" on storage.objects
  for select using (bucket_id = 'assets' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "assets owner insert" on storage.objects
  for insert with check (bucket_id = 'assets' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "assets owner update" on storage.objects
  for update using (bucket_id = 'assets' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "assets owner delete" on storage.objects
  for delete using (bucket_id = 'assets' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "generations owner read" on storage.objects
  for select using (bucket_id = 'generations' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "generations owner insert" on storage.objects
  for insert with check (bucket_id = 'generations' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "generations owner update" on storage.objects
  for update using (bucket_id = 'generations' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "generations owner delete" on storage.objects
  for delete using (bucket_id = 'generations' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "exports owner read" on storage.objects
  for select using (bucket_id = 'exports' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "exports owner insert" on storage.objects
  for insert with check (bucket_id = 'exports' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "exports owner update" on storage.objects
  for update using (bucket_id = 'exports' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "exports owner delete" on storage.objects
  for delete using (bucket_id = 'exports' and auth.uid()::text = (storage.foldername(name))[1]);
