---
name: local-supabase
description: Run tests and work with this repo's local Supabase stack — db:* commands, seed regeneration from menus.json, migration rules, test-data discipline, troubleshooting. Use when running tests, changing schema or migrations, editing seed/mock data, or debugging DB-related test failures.
---

# Local Supabase stack — how this repo's data & tests work

There is **no fixture/in-memory mode**. Runtime, `pnpm dev`, and every test run
against a real local Supabase stack (Postgres + PostgREST + Storage in Docker).
This is a deliberate, user-approved hard gate: if Docker or the supabase CLI is
missing, tests fail with install guidance. **Never add a skip, fallback, or env
escape hatch to `test/global-db-setup.ts`.**

## Commands

```bash
pnpm db:start    # boot the stack (once; keeps running between test runs)
pnpm db:status   # print URL + keys (paste into .env for pnpm dev)
pnpm db:reset    # regenerate seed.sql from menus.json, then migrations + seed
pnpm db:stop     # free resources when done
pnpm test        # unit + integration; each vitest config auto-resets + seeds
```

All supabase CLI calls must go through these scripts — they carry the required
`--workdir infra` flag (config lives at `infra/supabase/config.toml`; the CLI
has no option to relocate the classic migrations dir).

## Data flow (single source of truth)

```
fixtures/venue/menus.json  --(scripts/generate-seed.mjs)-->  infra/supabase/seed.sql  --(db reset)-->  DB
   committed, EDIT THIS            committed                    GITIGNORED, never edit
```

- To change mock data: edit `menus.json`; the next `pnpm db:reset` / test run
  regenerates and injects the SQL. Never hand-edit `seed.sql`.
- Keep verbatim: token values `fixture-double-chicken-demo` /
  `fixture-nightjar-demo-token` and the `Demo Bar` account name — tests and the
  demo links depend on their sha256 hashes landing in the seed.
- The `authUser` block on an account (`demo@vibetail.test` / `vibetail-demo`)
  becomes `auth.users` + `auth.identities` rows, so email/password sign-in works
  right after a reset. Keep those two values verbatim too — identity-auth.test.ts
  signs in with them. Emitted before `venue_accounts` because `auth_user_id` has
  an FK to `auth.users`; pgcrypto is schema-qualified (`extensions.crypt`).

## Migrations (`infra/supabase/migrations/`)

- Applied in filename order: `0000_baseline` → `0001_venue_mvp_enum` →
  `0002_venue_mvp` → `0003_supabase_auth`. Purely numeric prefixes only — the
  CLI silently skips names like `0001a_*`.
- One transaction per file (why the enum `add value` lives alone in 0001).
- `0000_baseline.sql` reconstructs the legacy shared-project schema, anon RLS
  policies, and PG17 hardened-image grants; its predicates are reconstructions
  to be reconciled against the shared project's `pg_policies`.
- Production migrations remain manual-apply with explicit approval
  (see `infra/supabase/README.md` and `AGENTS.md`). Local `db reset` is free.

## Writing tests

- **Self-created data only** for anything that writes: build your own
  account/venue/drinks through the services, with a unique file-level prefix
  (existing conventions: `svc-test-*`, `vms-test-*`, `webint-*`, `idauth-*`;
  helpers in `packages/venue-core/test/helpers.ts`).
- Seed rows are **read-only** assertions (consumer lookups, dashboards).
- Identity/auth tests: create a real GoTrue user first
  (`auth.admin.createUser` with `email_confirm: true`) —
  `venue_accounts.auth_user_id` has a FK to `auth.users`.
- Both vitest configs run with `fileParallelism: false` (shared DB). Keep it.
- Watch mode does NOT re-reset between reruns — unique names (not fixed ones)
  keep reruns from tripping unique constraints.
- Anon-key reads go through RLS: hidden rows read as *not found*, so
  merchant-inactive / menu-unpublished states surface as `*_NOT_FOUND` errors,
  not their internal variants.

## Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `Supabase CLI not found` / `Docker is not running` | `brew install supabase/tap/supabase`; start Docker Desktop |
| `Database client error. Retrying the connection.` | PostgREST not ready right after reset — globalSetup already polls readiness; if seen elsewhere, wait/retry |
| Tests hang pulling images | first `db:start` downloads ~2GB; Docker Desktop stuck in pause loop → quit and restart it |
| `permission denied for table …` on a fresh migration | PG17 images harden `public` schema defaults — new tables need the grants block pattern from `0000_baseline.sql` |
| anon queries return empty instead of erroring | missing RLS SELECT policy on a new table — add one to the migration |
