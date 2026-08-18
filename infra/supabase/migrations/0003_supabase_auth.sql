-- 0003_supabase_auth.sql
-- Google sign-in via Supabase Auth, shared by guests and venue owners.
-- Review + apply manually; never auto-applied (see AGENTS.md and infra/supabase/README.md).
--
-- One account row serves both surfaces: owning a venue is just a non-null
-- merchant_id. Guests may sign in but are never required to.
--
-- Prerequisite: enable the Google provider in Dashboard → Authentication →
-- Sign In / Providers, and add https://<app-host>/auth/callback to the
-- redirect allowlist under Authentication → URL Configuration.

-- ---------------------------------------------------------------------------
-- Accounts: link to auth.users
-- ---------------------------------------------------------------------------

alter table public.venue_accounts
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;

alter table public.venue_accounts
  add column if not exists email text;

-- Nullable unique: legacy passwordless rows keep auth_user_id null, and Postgres
-- allows many nulls in a unique index.
create unique index if not exists venue_accounts_auth_user_key
  on public.venue_accounts (auth_user_id);

-- name_normalized stays NOT NULL. Identity accounts fill it with the email
-- address and fall back to the auth user id when that name is already taken.

-- ---------------------------------------------------------------------------
-- Optional account attribution on consumer events
-- ---------------------------------------------------------------------------

alter table public.match_events
  add column if not exists account_id uuid references public.venue_accounts(id) on delete set null;

create index if not exists match_events_account_idx
  on public.match_events (account_id, created_at desc)
  where account_id is not null;

alter table public.match_feedback
  add column if not exists account_id uuid references public.venue_accounts(id) on delete set null;

create index if not exists match_feedback_account_idx
  on public.match_feedback (account_id, created_at desc)
  where account_id is not null;

-- RLS is unchanged: all four tables above already run RLS with zero policies,
-- so only the service-role key reaches them. The browser's publishable key is
-- used solely for the Auth API (token issue + `auth.getUser`), never for reads
-- of these tables.

-- ---------------------------------------------------------------------------
-- Migrating an existing passwordless venue owner (manual, one row at a time)
-- ---------------------------------------------------------------------------
-- A venue owner who used the old account-name login gets a *new* empty account
-- on their first Google sign-in, because nothing links the two. To hand the
-- existing venue to their Google identity instead:
--
--   1. Have them sign in with Google once, so auth.users has their row.
--   2. select id, email from auth.users where email = '<their-google-email>';
--   3. delete from public.venue_accounts
--        where auth_user_id = '<auth-user-id>';        -- the empty new account
--   4. update public.venue_accounts
--        set auth_user_id = '<auth-user-id>', email = '<their-google-email>'
--        where name_normalized = '<old account name, lowercased>';
--
-- Skip this entirely if no venue has been created through the old login yet.

-- ---------------------------------------------------------------------------
-- Optional cleanup once every deployment runs AUTH_PROVIDER=supabase
-- ---------------------------------------------------------------------------
-- public.venue_sessions only backs the passwordless login and is untouched by
-- the Supabase Auth path. Drop it deliberately, not as part of this migration:
--   drop table public.venue_sessions;

-- ---------------------------------------------------------------------------
-- Staging verification checklist (manual)
-- ---------------------------------------------------------------------------
-- 1. GET /v1/config returns {"auth":{"provider":"supabase", ...}} and contains
--    no service-role key.
-- 2. /venue shows "Continue with Google"; the account-name form is gone.
-- 3. Completing Google sign-in lands on /auth/callback and then /venue/setup,
--    and inserts exactly one venue_accounts row with auth_user_id + email set.
-- 4. Signing in a second time reuses that row (no duplicate insert).
-- 5. POST /v1/venue/session with a name returns 400 (name login refused).
-- 6. Sign out, then reload /venue/dashboard → redirected back to /venue.
-- 7. Signed out: scan /m/<slug>, match, submit feedback → match_events and
--    match_feedback rows have account_id = null (guest flow still works).
-- 8. Signed in as a guest: repeat step 7 → both rows carry that account_id.
-- 9. Anonymous (publishable key) SELECT on venue_accounts still returns zero rows.
