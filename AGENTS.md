# Vibetail Agent Guidance

## Scope and precedence

- Platform instructions and user requests take precedence over this file.
  More-specific `AGENTS.md` files take precedence within their directories. If
  an instruction conflicts or blocks progress, name the exact instruction and
  ask only when a decision or authority is genuinely required.
- Make the requested change completely: inspect the relevant code, implement,
  validate proportionately, and fix failures caused by the change. Do not stop
  after a first pass when safe local follow-through remains.
- Keep changes focused. Preserve unrelated working-tree changes and do not add
  dependencies, broad refactors, or external integration work unless requested.

## Read the right context

- Read `docs/CODEX_MASTER_PLAN.md` for architecture, new features, service or
  provider boundaries, data-model work, and product-scope decisions. Do not
  load it for isolated documentation, typo, or mechanical changes.
- Consult the closest README and the relevant package or feature before making
  a change there. For public venue behavior and boundaries, start with
  `apps/web/README.md` and the architecture documents it links to.
- For user-facing frontend work, read
  `docs/agent-prompts/frontend.md` before implementation. Follow it alongside
  the existing design system and repository constraints; do not install a UI,
  icon, or animation package merely because the prompt mentions one.
- The old Vibetail repo is a read-only reference. Never modify, format, delete,
  or make it a runtime, package, build, or deployment dependency.

## Architecture and safety constraints

- Do not add Lovable packages, gateways, secrets, or runtime dependencies.
- Keep temporary legacy venue UI isolated and replaceable. UI reaches venue
  functionality only through shared contracts and APIs.
- Business logic must not depend directly on sandbox or model providers.
- Keep secrets server-only; never expose service-role, model, or sandbox
  credentials to the browser or logs.
- Migrations must remain backward compatible because staging applies them while
  the previous release is still serving. Ship additive changes directly; make
  a drop or rename a two-release change.
- Do not apply production migrations, deploy to production, or modify DNS
  without explicit approval.

## Local database and tests

- There is no fixture/in-memory runtime or test mode. Runtime, development,
  and every test use the local Supabase stack; Docker and the Supabase CLI are
  prerequisites for `pnpm test`. Vitest global setup resets and seeds the DB
  and must never gain a skip or fallback path.
- Start the stack once with `pnpm db:start`; use `pnpm test` or `pnpm db:reset`
  as appropriate. Local tests are safe to run, repair when the requested change
  caused a failure, and rerun without asking for approval at each step.
- Edit `fixtures/venue/menus.json`, never the generated and gitignored
  `infra/supabase/seed.sql`; see `.claude/skills/local-supabase/SKILL.md` for
  the workflow.
- DB-writing tests create uniquely named data. Seed rows are read-only
  assertions. Identity tests create real GoTrue users with
  `auth.admin.createUser`, because `venue_accounts.auth_user_id` is a FK.
- Validate in proportion to risk. Before declaring a feature phase or release
  complete, run `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
