-- Row Level Security policies control *which rows* a role can see — they do
-- not, by themselves, grant a role permission to query a table at all. When
-- a Supabase project is created with "Automatically expose new tables"
-- disabled (the more secure default, recommended in this project's setup
-- docs), Postgres never receives the base GRANTs for the `authenticated`
-- role on tables created via raw SQL migrations like 0001_init.sql. Without
-- this, every query from the app fails with "permission denied for table
-- ..." even though the RLS policies are correct.
--
-- This migration grants the base table/sequence privileges `authenticated`
-- needs, and sets default privileges so any future `create table` in this
-- migration set keeps working without repeating this step.

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;
