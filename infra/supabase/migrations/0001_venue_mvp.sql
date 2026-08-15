-- 0001_venue_mvp.sql
-- Venue MVP: account login, drink library, menu↔drink join, analytics events.
-- Review + apply manually; never auto-applied (see AGENTS.md and infra/supabase/README.md).
--
-- NOTE: `alter type ... add value` cannot run inside the same transaction as
-- statements that use the new value. Run STEP 1 alone (autocommit), then STEP 2.

-- ---------------------------------------------------------------------------
-- STEP 1: enum extension (run alone)
-- ---------------------------------------------------------------------------

alter type public.menu_status add value if not exists 'archived';

-- ---------------------------------------------------------------------------
-- STEP 2: tables, columns, indexes, RLS (run after step 1 committed)
-- ---------------------------------------------------------------------------

create type public.venue_type as enum ('cocktail_bar', 'restaurant', 'event', 'other');

alter table public.merchants
  add column if not exists address text,
  add column if not exists venue_type public.venue_type;

-- Passwordless MVP accounts: knowing the account name grants access.
-- Documented product decision; replace with Supabase Auth before real launch.
create table public.venue_accounts (
  id uuid primary key default gen_random_uuid(),
  name_normalized text not null unique,
  display_name text not null,
  merchant_id uuid unique references public.merchants(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.venue_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.venue_accounts(id) on delete cascade,
  token_hash text not null unique, -- sha256 hex of the opaque bearer token
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index venue_sessions_account_idx on public.venue_sessions (account_id);

create table public.drinks (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  name text not null,
  description text,
  price text,
  image_url text,
  ingredients text[] not null default '{}',
  flavor_tags text[] not null default '{}',
  allergens text[] not null default '{}',
  base_spirit text,
  strength text check (strength is null or strength in ('zero', 'light', 'medium', 'strong')),
  alcoholic boolean not null default true,
  recommendation_note text,
  availability_status public.menu_item_availability not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index drinks_merchant_idx on public.drinks (merchant_id);

create table public.menu_drinks (
  menu_id uuid not null references public.menus(id) on delete cascade,
  drink_id uuid not null references public.drinks(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (menu_id, drink_id)
);
create index menu_drinks_drink_idx on public.menu_drinks (drink_id);

create table public.menu_views (
  id bigint generated always as identity primary key,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  menu_id uuid, -- deliberately no FK: history survives menu deletion
  created_at timestamptz not null default now()
);
create index menu_views_merchant_created_idx on public.menu_views (merchant_id, created_at desc);

create table public.match_events (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  menu_id uuid,          -- snapshot, no FK
  item_id uuid not null, -- drink id or legacy menu_items id, no FK
  item_name text not null, -- snapshot so dashboards survive deletions
  trace_id text not null,
  created_at timestamptz not null default now()
);
create index match_events_merchant_created_idx on public.match_events (merchant_id, created_at desc);

create table public.match_feedback (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.match_events(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);
create index match_feedback_merchant_created_idx on public.match_feedback (merchant_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- Private tables: enable RLS with zero policies (service-role access only),
-- mirroring merchant_access_tokens.
-- ---------------------------------------------------------------------------

alter table public.venue_accounts enable row level security;
alter table public.venue_sessions enable row level security;
alter table public.menu_views     enable row level security;
alter table public.match_events   enable row level security;
alter table public.match_feedback enable row level security;

-- Public consumer reads use the publishable key, so drink-backed published
-- menus need scoped SELECT policies. Without these, v2 menus render empty for
-- consumers in supabase mode while working in fixture mode.

alter table public.drinks      enable row level security;
alter table public.menu_drinks enable row level security;

create policy "public read menu_drinks of published menus"
  on public.menu_drinks for select
  using (
    exists (
      select 1
      from public.menus m
      join public.merchants mer on mer.id = m.merchant_id
      where m.id = menu_drinks.menu_id
        and m.status = 'published'
        and m.published_version_id is not null
        and mer.is_active
    )
  );

create policy "public read drinks on published menus"
  on public.drinks for select
  using (
    exists (
      select 1
      from public.menu_drinks md
      join public.menus m on m.id = md.menu_id
      join public.merchants mer on mer.id = m.merchant_id
      where md.drink_id = drinks.id
        and m.status = 'published'
        and m.published_version_id is not null
        and mer.is_active
    )
  );

-- ---------------------------------------------------------------------------
-- Staging verification checklist (manual)
-- ---------------------------------------------------------------------------
-- 1. POST /v1/venue/session with a new name creates a venue_accounts row.
-- 2. Create venue → merchants row gains address/venue_type; account linked.
-- 3. Create drinks + menu + publish → menus.status = 'published',
--    menu_versions snapshot row exists, previous published menu = 'archived'.
-- 4. GET /m/<slug> with the PUBLISHABLE key shows drink-backed items
--    (validates the two public RLS policies).
-- 5. Match → match_events row; feedback → match_feedback row; duplicate
--    feedback returns 409 (unique violation on match_id).
-- 6. Delete a published menu → three-step delete works despite the
--    menus.published_version_id ↔ menu_versions.menu_id FK cycle.
-- 7. Anonymous (publishable key) SELECT on venue_accounts / venue_sessions /
--    match_events / match_feedback / menu_views returns zero rows.
