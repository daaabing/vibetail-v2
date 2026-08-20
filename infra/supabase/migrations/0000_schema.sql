-- 0000_schema.sql
-- The complete database schema, replayed from scratch by `pnpm db:reset`
-- (supabase --workdir infra db reset) followed by the generated seed.sql.
-- The local Supabase stack is the only database — there is no remote or
-- production project. To change the schema, edit this file in place and
-- reset. Append-only incremental migrations only become necessary if a
-- persistent deployment ever exists.

-- ---------------------------------------------------------------------------
-- Role grants
--
-- The supabase/postgres 17 image hardens the public schema: objects created
-- by `postgres` (i.e. by this file) receive no default SELECT/INSERT/UPDATE/
-- DELETE grants for anon/authenticated/service_role — without these, every
-- PostgREST query fails with "permission denied for table …" regardless of
-- RLS. Restore the classic permissive defaults; RLS (enabled on every table
-- below) is the actual gate.
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

create type public.menu_status as enum ('draft', 'published', 'paused', 'archived');

create type public.menu_item_availability as enum ('active', 'sold_out', 'hidden');

create type public.venue_type as enum ('cocktail_bar', 'restaurant', 'event', 'other');

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
-- Merchants
-- ---------------------------------------------------------------------------

create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_intro text,
  logo_url text,
  cover_image_url text,
  is_active boolean not null default true,
  address text,
  venue_type public.venue_type,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger merchants_set_updated_at
  before update on public.merchants
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Menus
--
-- menus ↔ menu_versions form an FK cycle (menus.published_version_id →
-- menu_versions.id, menu_versions.menu_id → menus.id), so menus is created
-- first without the published_version FK and the constraint is added after
-- menu_versions exists.
-- ---------------------------------------------------------------------------

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
  -- Legacy game columns: NOT NULL with no default, every code path supplies
  -- them explicitly (see supabase-venue-management.ts).
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

-- Legacy per-menu items (the old /manage/:privateToken flow writes these; v2
-- menus derive items from drinks via menu_drinks). No price column — v2
-- pricing lives on drinks.price.
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

create index menu_items_menu_sort_idx on public.menu_items (menu_id, sort_order);

create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

-- Legacy private-link management tokens (the /manage/:privateToken flow).
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
-- Venue accounts
--
-- One account row serves both surfaces: owning a venue is just a non-null
-- merchant_id. AUTH_PROVIDER=supabase links rows to auth.users via
-- auth_user_id; name_normalized stays NOT NULL for identity accounts too
-- (filled with the email, falling back to the auth user id on collision).
-- AUTH_PROVIDER=none uses name_normalized alone plus venue_sessions tokens.
-- ---------------------------------------------------------------------------

create table public.venue_accounts (
  id uuid primary key default gen_random_uuid(),
  name_normalized text not null unique,
  display_name text not null,
  merchant_id uuid unique references public.merchants(id) on delete set null,
  auth_user_id uuid references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

-- Nullable unique: name-login rows keep auth_user_id null, and Postgres
-- allows many nulls in a unique index.
create unique index venue_accounts_auth_user_key
  on public.venue_accounts (auth_user_id);

-- Bearer sessions for the AUTH_PROVIDER=none name login only; the Supabase
-- Auth path never touches this table.
create table public.venue_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.venue_accounts(id) on delete cascade,
  token_hash text not null unique, -- sha256 hex of the opaque bearer token
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index venue_sessions_account_idx on public.venue_sessions (account_id);

-- ---------------------------------------------------------------------------
-- Drink library
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Analytics events
-- Snapshot-style: no FK on menu_id/item_id and item_name copied inline, so
-- dashboards survive menu/drink deletion.
-- ---------------------------------------------------------------------------

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
  -- Optional attribution: signed-in guests get their account recorded,
  -- anonymous matching stays fully supported.
  account_id uuid references public.venue_accounts(id) on delete set null,
  created_at timestamptz not null default now()
);
create index match_events_merchant_created_idx on public.match_events (merchant_id, created_at desc);
create index match_events_account_idx
  on public.match_events (account_id, created_at desc)
  where account_id is not null;

create table public.match_feedback (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references public.match_events(id) on delete cascade,
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  account_id uuid references public.venue_accounts(id) on delete set null,
  created_at timestamptz not null default now()
);
create index match_feedback_merchant_created_idx on public.match_feedback (merchant_id, created_at desc);
create index match_feedback_account_idx
  on public.match_feedback (account_id, created_at desc)
  where account_id is not null;

-- ---------------------------------------------------------------------------
-- RLS
--
-- Public consumer reads use the publishable (anon) key, so published content
-- needs scoped SELECT policies. Private tables enable RLS with zero policies:
-- only the service-role key reaches them.
-- ---------------------------------------------------------------------------

alter table public.merchants              enable row level security;
alter table public.menus                  enable row level security;
alter table public.menu_versions          enable row level security;
alter table public.menu_items             enable row level security;
alter table public.merchant_access_tokens enable row level security; -- zero policies
alter table public.venue_accounts         enable row level security; -- zero policies
alter table public.venue_sessions         enable row level security; -- zero policies
alter table public.drinks                 enable row level security;
alter table public.menu_drinks            enable row level security;
alter table public.menu_views             enable row level security; -- zero policies
alter table public.match_events           enable row level security; -- zero policies
alter table public.match_feedback         enable row level security; -- zero policies

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
-- Storage
-- Private bucket used by SupabaseVenueMediaStorage (uploads + signed URLs via
-- the service role; no storage.objects policies → not anon-readable).
-- Idempotent so the seed's bucket insert coexists.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('merchant-menus', 'merchant-menus', false)
on conflict (id) do nothing;
