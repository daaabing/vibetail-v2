# Venue seed data

`menus.json` is the seed-data source for the Supabase database. `scripts/generate-seed.mjs` deterministically converts it into `infra/supabase/seed.sql` (same JSON in, byte-identical SQL out), and `supabase db reset` loads that seed after the migrations — via `pnpm db:reset` and automatically before every `pnpm test` run. It borrows the public identity `double-chicken-please/main` and a few menu names for realism; it is not a production export and contains no personal data.

It covers active and inactive merchants, published and draft menus, active/sold-out/hidden items, the drink-library-backed `vibetail-taproom` venue with its `Demo Bar` account, and seeded menu-view/match/feedback events. Event timestamps are stored as relative `minutesAgo` offsets, so dashboards stay populated no matter when the seed runs.

Legacy management tokens:

- `fixture-double-chicken-demo`
- `fixture-nightjar-demo-token`

They are deliberately public test strings, not credentials; the generated seed stores only their SHA-256 hashes. Do not rename them (or the `Demo Bar` account) — tests and demo links depend on the exact values.

To change seed data, edit `menus.json` and run `pnpm db:reset`. Never commit production exports, credentials, or personal data.
