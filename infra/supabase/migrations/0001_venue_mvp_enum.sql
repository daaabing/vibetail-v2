-- 0001_venue_mvp_enum.sql
-- Venue MVP, step 1 of 2: extend menu_status with 'archived'.
-- Review + apply manually; never auto-applied (see AGENTS.md and
-- infra/supabase/README.md).
--
-- Why a separate file: a value added by `alter type ... add value` cannot be
-- referenced by other statements in the same transaction, and the Supabase CLI
-- wraps each migration file in its own transaction. Keeping the enum extension
-- alone here guarantees 'archived' is committed before 0002_venue_mvp.sql (and application
-- code, e.g. publishVenueMenu archiving the previous published menu) can rely
-- on it. This mirrors exactly how the original 0001_venue_mvp.sql was applied
-- to the shared project: STEP 1 run alone (autocommit), then STEP 2.

alter type public.menu_status add value if not exists 'archived';
