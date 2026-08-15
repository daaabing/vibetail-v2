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
