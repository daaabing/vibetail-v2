# Supabase migrations

Reviewed schema changes for the shared Supabase project. Nothing in this
directory is applied automatically: per `AGENTS.md`, production database
migrations require explicit human approval and are executed manually (SQL
editor or `psql`) after review.

## Applying a migration

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
| `migrations/0001_venue_mvp.sql` | Venue MVP: accounts, sessions, drink library, menu↔drink join, menu views, match events, feedback, `archived` menu status, merchant address/venue type. |
| `migrations/0003_supabase_auth.sql` | Supabase Auth (Google) for guests and venue owners: links `venue_accounts` to `auth.users`, adds `email`, and adds optional `account_id` attribution on `match_events` / `match_feedback`. Includes the manual steps for handing an existing passwordless venue to a Google identity. |

The gap at `0002` is deliberate: the in-flight local Supabase stack branch splits
`0001_venue_mvp.sql` into `0001_venue_mvp_enum.sql` + `0002_venue_mvp.sql`, and
`0003` is numbered to land after that split without a rename.
