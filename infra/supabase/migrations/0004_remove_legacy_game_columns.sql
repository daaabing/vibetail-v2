-- 0004_remove_legacy_game_columns.sql
-- Remove the final database dependency on the retired Lovable-era game model.
--
-- Apply to staging first. Production application requires explicit approval.
-- The application change paired with this migration stops writing either
-- column, so deploy the updated application only after this SQL succeeds.

alter table public.menus
  drop column if exists enabled_game_ids,
  drop column if exists game_display_order;

-- Verification:
-- select column_name
-- from information_schema.columns
-- where table_schema = 'public'
--   and table_name = 'menus'
--   and column_name in ('enabled_game_ids', 'game_display_order');
-- Expected: zero rows.
