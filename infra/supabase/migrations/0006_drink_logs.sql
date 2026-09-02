-- 0006_drink_logs.sql
-- Consumer drink journal, synced to the account. Rows are written only by the
-- server (service role) after bearer-token auth resolves a venue_accounts row,
-- so RLS is enabled with zero policies — the same private-table pattern as
-- venue_sessions. Photos live in a private storage bucket (no objects
-- policies: service-role upload + signed URLs, like merchant-menus).
--
-- The id is client-generated so the on-device → cloud migration is idempotent
-- (re-uploading an already-synced entry conflicts instead of duplicating).
--
-- Review + apply manually to the shared project (see infra/supabase/README.md).

create table public.drink_logs (
  id uuid primary key,
  account_id uuid not null references public.venue_accounts(id) on delete cascade,
  drink_name text not null,
  venue_name text,
  rating integer check (rating between 1 and 5),
  note text,
  photo_path text,
  source text not null default 'camera' check (source in ('camera', 'match')),
  -- When the guest logged it (client clock, preserved by migration); the
  -- calendar buckets by this in the device's local timezone.
  logged_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index drink_logs_account_logged
  on public.drink_logs (account_id, logged_at desc);

alter table public.drink_logs enable row level security;
-- No policies on purpose: service-role access only.

insert into storage.buckets (id, name, public)
values ('drink-logs', 'drink-logs', false)
on conflict (id) do nothing;

-- Manual staging verification:
--   select count(*) from public.drink_logs;                      (0, table exists)
--   select id, public from storage.buckets where id='drink-logs'; (private bucket exists)
--   POST /v1/me/drink-logs without a token → 401; with a token → 201.
