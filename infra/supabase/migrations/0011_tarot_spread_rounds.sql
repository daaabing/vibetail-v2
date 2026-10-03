-- Store the generated spread and every selected card while keeping the original
-- card_id/orientation columns for compatibility with the first release.
alter table public.event_tarot_rounds
  add column if not exists spread_id text,
  add column if not exists spread_name text,
  add column if not exists draws jsonb,
  add column if not exists readings jsonb;
