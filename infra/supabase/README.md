# Supabase migrations

Reviewed schema changes for the shared Supabase project. Nothing in this
directory is applied automatically: per `AGENTS.md`, production database
migrations require explicit human approval and are executed manually (SQL
editor or `psql`) after review.

## Applying a migration (shared project)

1. Review the migration file end to end, including RLS policies.
2. Run it against staging first and complete the verification checklist at the
   bottom of the migration file.
3. Apply to production only with explicit approval.
4. After applying, regenerate `packages/venue-core/src/repositories/database.types.ts`
   with the Supabase type generator (the in-repo copy is a hand-maintained
   snapshot until then).

## Migrations

| File | Purpose |
| --- | --- |
| `migrations/0000_baseline.sql` | Local-stack baseline reconstructing the legacy shared-project schema that predates `0001`: `menu_status` / `menu_item_availability` enums, `merchants`, `menus`, `menu_versions`, `menu_items`, `merchant_access_tokens`, their anon SELECT RLS policies, `updated_at` triggers, and the private `merchant-menus` storage bucket. Never apply it to the shared project — that schema already exists there. |
| `migrations/0001_venue_mvp_enum.sql` | Venue MVP step 1: adds the `archived` value to `menu_status`. Lives in its own file because `alter type … add value` must be committed before the value can be referenced. |
| `migrations/0002_venue_mvp.sql` | Venue MVP step 2: accounts, sessions, drink library, menu↔drink join, menu views, match events, feedback, merchant address/venue type, public RLS policies. |
| `migrations/0003_supabase_auth.sql` | Supabase Auth (Google) for guests and venue owners: links `venue_accounts` to `auth.users`, adds `email`, and adds optional `account_id` attribution on `match_events` / `match_feedback`. Includes the manual steps for handing an existing passwordless venue to a Google identity. |
| `migrations/0004_remove_legacy_game_columns.sql` | Drops `menus.enabled_game_ids` and `menus.game_display_order`, the final schema dependency on the retired game registry. Apply to staging before deploying the paired application change; production still requires explicit approval. |

The shared project was migrated by manually running the original
`0001_venue_mvp.sql` in two steps (STEP 1 = today's `0001`, STEP 2 = today's
`0002`). The split files are semantically equivalent to what was applied; the
original single file was removed when it was split.

## Local stack

This directory is now also the migration source for the local Supabase stack:
`supabase --workdir infra db reset` (invoked via the repo's `package.json`
scripts and the test global setup) replays `0000` → `0001` → `0002` → `0003` → `0004` into the
local database and then loads the generated `seed.sql`.

`0000_baseline.sql` exists only so `0001`/`0002` can replay onto an empty
local database. The shared project remains the source of truth for the legacy
schema: the baseline's column shapes come from `database.types.ts` and observed
code behavior, and its RLS predicates should be reconciled against the shared
project's `pg_policies`.
