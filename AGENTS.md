# Vibetail Repository Rules

- Read `docs/CODEX_MASTER_PLAN.md` before architecture or implementation work.
- There is no fixture/in-memory data mode. Runtime, dev, and ALL tests (unit
  included) run against the local Supabase stack — Docker + supabase CLI are
  hard prerequisites for `pnpm test`; the vitest globalSetup resets and seeds
  the database automatically and must never gain a skip/fallback path.
- Local DB workflow: `pnpm db:start` once, then `pnpm test` / `pnpm db:reset`.
  Seed data comes from `fixtures/venue/menus.json` via `scripts/generate-seed.mjs`
  (the generated `infra/supabase/seed.sql` is gitignored — edit the JSON, never
  the SQL). Details: `.claude/skills/local-supabase/SKILL.md`.
- Tests that write the DB must create their own uniquely-named data; seed rows
  are read-only assertions. Identity tests need real GoTrue users
  (`auth.admin.createUser`) because `venue_accounts.auth_user_id` is a FK.
- The old Vibetail repo is read-only reference.
- Do not add Lovable packages, gateways, secrets, or runtime dependencies.
- Temporary legacy venue UI must remain isolated and replaceable.
- UI must access venue functionality through shared contracts and APIs.
- Business logic must not depend directly on sandbox or model providers.
- Do not apply production database migrations without explicit approval.
- Do not deploy to production or modify DNS without explicit approval.
- Run lint, typecheck, tests, and build before declaring a phase complete.