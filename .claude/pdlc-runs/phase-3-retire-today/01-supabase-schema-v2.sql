-- ============================================================================
-- Phase 3-A v6: schema upgrade — single payload blob → named JSONB columns
-- ----------------------------------------------------------------------------
-- WHY: the v1 schema stored everything in ONE jsonb `payload` column. Once
-- the user has phases + tracker + networth + expenses + profiles, the blob
-- becomes hundreds of KB and impossible to visually verify in the dashboard
-- ("did my delete actually save?"). Splitting into named columns lets the
-- Supabase Table Editor show each section as its own clickable cell.
--
-- Run this in: Supabase SQL Editor → New Query → paste → Run.
-- It is idempotent — safe to run multiple times.
-- ============================================================================

-- 1) Add the new named columns alongside the existing payload column
alter table public.app_data
  add column if not exists inputs        jsonb default '{}'::jsonb,
  add column if not exists phases        jsonb default '[]'::jsonb,
  add column if not exists tracker       jsonb default '{}'::jsonb,
  add column if not exists networth      jsonb default '[]'::jsonb,
  add column if not exists expenses      jsonb default '{}'::jsonb,
  add column if not exists profiles      jsonb default '{}'::jsonb,
  add column if not exists mc_settings   jsonb default '{}'::jsonb,
  add column if not exists meta          jsonb default '{}'::jsonb;

-- 2) One-time migration: split existing payload blob into named columns
-- (Idempotent — only runs the split if columns are still empty defaults)
update public.app_data
set
  inputs       = coalesce(payload->'inputs',        '{}'::jsonb),
  phases       = coalesce(
    case
      when payload->'storage'->>'rp_phases' is not null
        then (payload->'storage'->>'rp_phases')::jsonb
      else '[]'::jsonb
    end, '[]'::jsonb),
  tracker      = jsonb_build_object(
    'entries',    coalesce((payload->'storage'->>'rp_tracker_entries')::jsonb, '{}'::jsonb),
    'startDate',  coalesce(payload->'storage'->>'rp_tracker_start_date', null),
    'mode',       coalesce(payload->'storage'->>'rp_tracker_mode', 'default')
  ),
  networth     = coalesce(
    case when payload->'storage'->>'rp_networth_log' is not null
      then (payload->'storage'->>'rp_networth_log')::jsonb else '[]'::jsonb end,
    '[]'::jsonb),
  expenses     = coalesce(
    case when payload->'storage'->>'rp_expense_log' is not null
      then (payload->'storage'->>'rp_expense_log')::jsonb else '{}'::jsonb end,
    '{}'::jsonb),
  profiles     = jsonb_build_object(
    'all',          coalesce((payload->'storage'->>'rp_profiles')::jsonb, '{}'::jsonb),
    'active',       coalesce(payload->'storage'->>'rp_active_profile', null)
  ),
  mc_settings  = jsonb_build_object(
    'view',         coalesce(payload->'storage'->>'rp_projection_view', 'ideal'),
    'simCount',     coalesce(payload->'storage'->>'rp_mc_sim_count', '10000'),
    'milestoneSrc', coalesce(payload->'storage'->>'rp_milestone_source', null)
  ),
  meta         = jsonb_build_object(
    'darkMode',     coalesce(payload->'storage'->>'rp_dark_mode', 'false'),
    'lastSnap',     coalesce(payload->>'_ts', now()::text)
  )
where inputs = '{}'::jsonb -- only run on rows that haven't been split yet
  and payload is not null;

-- 3) Don't drop the payload column yet — keep it as a safety backup until
-- the client v6 has shipped + been confirmed working. After 1 week:
--   alter table public.app_data drop column payload;
