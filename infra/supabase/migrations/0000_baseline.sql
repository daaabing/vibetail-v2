-- 0000_baseline.sql
-- LOCAL-STACK BASELINE — never apply to the shared Supabase project.
--
-- Reconstructs the legacy schema that already exists in the shared project so
-- that 0001/0002 can replay onto an empty local database
-- (`supabase --workdir infra db reset`). Column shapes were derived from
-- packages/venue-core/src/repositories/database.types.ts plus what the code in
-- packages/venue-core/src/repositories/* actually reads and writes.
-- The shared project is the source of truth: the RLS predicates below are a
-- reconstruction of observed anon-read behavior and must be reconciled against
-- the shared project's pg_policies before being trusted for anything beyond
-- local tests.
--
-- Note: database.types.ts is a post-0001 snapshot, so it lists 'archived' in
-- menu_status; that value is deliberately absent here and added by 0001 (venue_mvp_enum).

-- ---------------------------------------------------------------------------
-- Role grants (local-only, mirrors the shared project's classic defaults)
--
-- The supabase/postgres 17 local image hardens the public schema: objects
-- created by `postgres` (i.e. by migrations) no longer receive default
-- SELECT/INSERT/UPDATE/DELETE grants for anon/authenticated/service_role —
-- without these, every PostgREST query fails with "permission denied for
-- table …" regardless of RLS. The shared project predates that hardening and
-- still has the classic permissive defaults, where RLS (enabled on every
-- table below and in 0002) is the actual gate. Restore the classic model for
-- the local replay; this file is never applied to the shared project.
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  grant all on tables to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant all on sequences to anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  grant execute on functions to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

-- 'archived' is added by 0001_venue_mvp_enum.sql.
create type public.menu_status as enum ('draft', 'published', 'paused');

create type public.menu_item_availability as enum ('active', 'sold_out', 'hidden');

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- The management adapters order menus by updated_at but never write the
-- column, so the database has to maintain it.
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_intro text,
  logo_url text,
  cover_image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- address + venue_type postdate the legacy schema; 0002 (venue_mvp) adds them.

create trigger merchants_set_updated_at
  before update on public.merchants
  for each row execute function public.set_updated_at();

-- menus ↔ menu_versions form an FK cycle (menus.published_version_id →
-- menu_versions.id, menu_versions.menu_id → menus.id), so menus is created
-- first without the published_version FK and the constraint is added after
-- menu_versions exists. The constraint name matches the shared project
-- (menus_published_version_fk, see database.types.ts).

create table public.menus (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  slug text not null,
  name text not null,
  status public.menu_status not null default 'draft',
  short_intro text,
  cover_image_url text,
  menu_theme text,
  menu_file_url text,
  menu_file_type text,
  published_version_id uuid, -- FK added below, after menu_versions exists
  -- NOT NULL with no default: the shared schema requires them and every code
  -- path supplies them explicitly ("Legacy columns still required by the
  -- shared schema", supabase-venue-management.ts).
  enabled_game_ids text[] not null,
  game_display_order text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, slug)
);

create index menus_merchant_idx on public.menus (merchant_id);

create trigger menus_set_updated_at
  before update on public.menus
  for each row execute function public.set_updated_at();

create table public.menu_versions (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus(id) on delete cascade,
  version_number integer not null,
  snapshot jsonb not null,
  published_at timestamptz not null default now()
);

create index menu_versions_menu_idx
  on public.menu_versions (menu_id, version_number desc);

-- Second half of the FK cycle. Deliberately no on-delete action: deleting a
-- published menu requires the three-step dance in deleteVenueMenu (null the
-- pointer, delete versions, delete the menu).
alter table public.menus
  add constraint menus_published_version_fk
  foreign key (published_version_id) references public.menu_versions(id);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid not null references public.menus(id) on delete cascade,
  name text not null,
  description text not null default '',
  image_url text,
  alcoholic boolean not null default true,
  base_spirit text,
  ingredients text[] not null default '{}',
  flavor_tags text[] not null default '{}',
  mood_tags text[] not null default '{}',
  allergens text[] not null default '{}',
  dimensions jsonb not null default '{}'::jsonb,
  translations jsonb not null default '{}'::jsonb,
  original_language text not null default 'en',
  recommendation_priority integer not null default 0,
  availability_status public.menu_item_availability not null default 'active',
  section text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- NOTE: no price column — the shared schema never had one, so legacy fixture
-- prices are lost in DB mode (tests must not assert on menu_items prices).

create index menu_items_menu_sort_idx on public.menu_items (menu_id, sort_order);

create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

create table public.merchant_access_tokens (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  token_hash text not null, -- sha256 hex of the opaque management token
  label text,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index merchant_access_tokens_merchant_idx
  on public.merchant_access_tokens (merchant_id);

-- ---------------------------------------------------------------------------
-- RLS
-- Reconstructed from the anon (publishable-key) reads in
-- packages/venue-core/src/repositories/supabase.ts. Reconcile the predicates
-- with the shared project's pg_policies.
-- ---------------------------------------------------------------------------

alter table public.merchants              enable row level security;
alter table public.menus                  enable row level security;
alter table public.menu_versions          enable row level security;
alter table public.menu_items             enable row level security;
alter table public.merchant_access_tokens enable row level security;
-- merchant_access_tokens: zero policies on purpose (service-role only).

create policy "public read active merchants"
  on public.merchants for select
  using (is_active);

create policy "public read published menus"
  on public.menus for select
  using (
    status = 'published'
    and published_version_id is not null
    and exists (
      select 1 from public.merchants mer
      where mer.id = menus.merchant_id
        and mer.is_active
    )
  );

create policy "public read published menu versions"
  on public.menu_versions for select
  using (
    exists (
      select 1
      from public.menus m
      join public.merchants mer on mer.id = m.merchant_id
      where m.published_version_id = menu_versions.id
        and m.status = 'published'
        and mer.is_active
    )
  );

create policy "public read menu_items of published menus"
  on public.menu_items for select
  using (
    exists (
      select 1
      from public.menus m
      join public.merchants mer on mer.id = m.merchant_id
      where m.id = menu_items.menu_id
        and m.status = 'published'
        and m.published_version_id is not null
        and mer.is_active
    )
  );

-- ---------------------------------------------------------------------------
-- Storage
-- Private bucket used by SupabaseVenueMediaStorage (uploads + signed URLs via
-- the service role; no storage.objects policies → not anon-readable).
-- Idempotent so a config.toml bucket declaration, if added later, coexists.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('merchant-menus', 'merchant-menus', false)
on conflict (id) do nothing;
