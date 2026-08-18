-- 0004_match_snapshot_vibe_bar.sql
-- Shareable match results and the guest Vibe Bar.
-- Review + apply manually; never auto-applied (see AGENTS.md and infra/supabase/README.md).

-- ---------------------------------------------------------------------------
-- Match snapshot: the model-authored copy that makes a result card worth
-- sharing. Snapshotted at record time so a shared link keeps rendering after
-- the menu changes. The guest's own words are deliberately NOT stored — the
-- share page shows the card, not the guest's private mood text.
-- ---------------------------------------------------------------------------

alter table public.match_events
  add column if not exists vibe_name text,
  add column if not exists tastes_like text,
  add column if not exists flavor_profile text,
  add column if not exists why_this_match text,
  add column if not exists roast text,
  add column if not exists venue_name text,
  add column if not exists venue_slug text,
  add column if not exists menu_name text,
  add column if not exists menu_slug text;

-- ---------------------------------------------------------------------------
-- Vibe Bar: a signed-in guest's saved matches. Service-role access only,
-- mirroring match_events: RLS enabled with zero policies.
-- ---------------------------------------------------------------------------

create table public.saved_drinks (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.venue_accounts(id) on delete cascade,
  match_id uuid not null references public.match_events(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (account_id, match_id)
);
create index saved_drinks_account_created_idx on public.saved_drinks (account_id, created_at desc);

alter table public.saved_drinks enable row level security;
