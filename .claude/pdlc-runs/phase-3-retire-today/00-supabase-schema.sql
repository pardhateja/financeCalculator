-- ============================================================================
-- Retirement Financial Planner — Supabase schema
-- ----------------------------------------------------------------------------
-- One table: app_data. Stores the entire app state (profiles, tracker
-- entries, all settings, MC inputs, etc.) as a single JSONB blob per user.
-- This keeps the schema simple — we don't need to model every Phase 1/2
-- input as its own column. The JSON shape is owned by the client (JS),
-- which already has all the field IDs catalogued (RP.getAllInputIds()).
--
-- Why one row per user, JSONB payload:
--   1. Schema-free: when we add new Phase 4/5/N inputs, no migrations
--      needed — client just adds new keys to the JSON.
--   2. Atomic: one row write = whole-app save, no consistency issues.
--   3. RLS-friendly: one user_id column to lock down per-user access.
--   4. Postgres JSONB is indexed + queryable if we ever need to.
--
-- Run this SQL in: Supabase Dashboard → SQL Editor → New Query → paste → Run.
-- ============================================================================

-- 1) The table itself
create table if not exists public.app_data (
  user_id     uuid        primary key references auth.users(id) on delete cascade,
  payload     jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- 2) Auto-update updated_at on every change
create or replace function public.touch_app_data_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_app_data_updated_at on public.app_data;
create trigger trg_app_data_updated_at
  before update on public.app_data
  for each row execute function public.touch_app_data_updated_at();

-- 3) Row Level Security — every user can only see/write their OWN row.
--    Without this, anyone with the anon key could read all users' data.
alter table public.app_data enable row level security;

-- Drop existing policies if re-running this script
drop policy if exists "users can read own row"   on public.app_data;
drop policy if exists "users can insert own row" on public.app_data;
drop policy if exists "users can update own row" on public.app_data;

create policy "users can read own row" on public.app_data
  for select
  using ( auth.uid() = user_id );

create policy "users can insert own row" on public.app_data
  for insert
  with check ( auth.uid() = user_id );

create policy "users can update own row" on public.app_data
  for update
  using      ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- 4) Convenience: confirm the policies are in place
-- select * from pg_policies where tablename = 'app_data';
