# Fixtures

Deterministic, non-production seed and test inputs live here. Never commit production exports, credentials, or personal data.

`venue/menus.json` is the seed-data source for the Supabase database: `scripts/generate-seed.mjs` converts it into `infra/supabase/seed.sql`, which `supabase db reset` applies after the migrations — via `pnpm db:reset` and automatically before every `pnpm test` run. See [`venue/README.md`](venue/README.md) for its contents and the checked-in demo tokens.
