# Vibetail

Vibetail helps venues turn a guest's mood into a personalized real-menu recommendation, while an AI agent safely builds and operates the experience inside an isolated, resumable sandbox.

This repository is the long-term source of truth. The previous Lovable repository is a read-only product and data reference; it is not a runtime, package, build, or deployment dependency.

## Phase 2.5 core product migration

The repository now contains Vibetail's runnable product spine: a landing page, global matching across active bars, a bar directory, venue-specific matching, and a minimal private-link management loop. Both match scopes use the same preference contract, candidate validation, provider, and canonicalization logic. Agent workflows and live FC/E2B integration remain intentionally deferred until Phase 3.

```text
apps/
  web/                 React platform/venue UI and Express API composition root
  agent-worker/        background agent execution composition root
packages/
  contracts/           versioned runtime schemas and shared TypeScript types
  venue-core/     venue repositories, matching use cases, validation
  agent-core/          durable workflow persistence ports
  sandbox-runtime/     provider-neutral sandbox lifecycle
  provider-fc/         Alibaba FC adapter boundary (implementation deferred)
  provider-e2b/        E2B adapter boundary (implementation deferred)
  model-providers/     provider-neutral model selection boundary
  observability/       structured telemetry contracts
infra/                 reviewed deployment assets only; no production state
fixtures/              deterministic seed-data source for the generated Supabase seed
```

## Requirements

- Node.js 22 or newer
- pnpm 11.16.0 (pinned by `packageManager`)

Enable Corepack if `pnpm` is not installed:

```sh
corepack enable
corepack prepare pnpm@11.16.0 --activate
```

## Local setup

```sh
cp .env.example .env
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm db:start   # requires Docker Desktop + Supabase CLI; see Testing below
pnpm test
pnpm build
```

Venue data always lives in Supabase; there is no in-memory fixture mode. The checked-in defaults use a deterministic model and the local sandbox, so no remote credentials are needed — but `pnpm dev`/`pnpm start` require `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in `.env`, copied from the local stack (`pnpm db:status`). Empty optional credentials are normalized as absent. Selecting `fc`, `e2b`, or a remote model provider makes that provider's required variables mandatory at startup. The preferred remote model selection is `MODEL_PROVIDER=openrouter`, `MODEL_NAME=openai/gpt-5-mini`, and a server-only `OPENROUTER_API_KEY`.

## Testing

All tests — including unit tests — require the local Supabase stack. This is a hard gate: there is no skip, fallback, or environment-variable escape hatch.

Prerequisites:

- Docker Desktop running
- Supabase CLI (`brew install supabase/tap/supabase`)

Run `pnpm db:start` once; the stack stays up in the background. After that, every `pnpm test` (and `pnpm test:unit` / `pnpm test:integration`) automatically regenerates `infra/supabase/seed.sql` from fixtures and runs `supabase db reset` (migrations + seed) via the shared vitest global setup at [`test/global-db-setup.ts`](test/global-db-setup.ts), then injects the local stack's `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` into the test environment. Tests never read `.env`.

Useful scripts (all drive the Supabase CLI with `--workdir infra`):

- `pnpm db:start` / `pnpm db:stop` — start/stop the local stack
- `pnpm db:status` — show local stack URLs and keys
- `pnpm db:reset` — regenerate the seed and reset the database manually

If the Supabase CLI is missing or Docker is not running, the test run fails immediately with installation guidance — this is the intended behavior, not an environment to work around.

## Local product walkthrough

The app serves data from the local Supabase stack — no remote credentials are needed:

```sh
pnpm db:start    # once; boots the local Supabase stack
pnpm db:reset    # regenerates the seed from fixtures/venue/menus.json, then applies migrations + seed
pnpm db:status   # copy SUPABASE_URL / publishable key / service-role key into .env
pnpm run dev
```

Use these exact local URLs:

- Landing: [http://127.0.0.1:3000/](http://127.0.0.1:3000/)
- Global match: [http://127.0.0.1:3000/match](http://127.0.0.1:3000/match)
- Explore bars: [http://127.0.0.1:3000/venues](http://127.0.0.1:3000/venues)
- Double Chicken Please experience: [http://127.0.0.1:3000/m/double-chicken-please/main](http://127.0.0.1:3000/m/double-chicken-please/main)
- Nightjar experience: [http://127.0.0.1:3000/m/nightjar-demo/cocktails](http://127.0.0.1:3000/m/nightjar-demo/cocktails)
- Venue backend (sign in as `Demo Bar`): [http://127.0.0.1:3000/venue](http://127.0.0.1:3000/venue)
- Stable QR target for the demo venue: [http://127.0.0.1:3000/m/vibetail-taproom](http://127.0.0.1:3000/m/vibetail-taproom)
- Legacy management demo: [http://127.0.0.1:3000/manage/fixture-double-chicken-demo](http://127.0.0.1:3000/manage/fixture-double-chicken-demo)

Optional drink-photo cutouts with local SAM 2 (menu photo/URL scan still uses the venue UI on `/venue`): see [`services/sam2-cutout/README.md`](services/sam2-cutout/README.md), then set `IMAGE_CUTOUT_PROVIDER=sam2`, `SAM2_CUTOUT_URL=http://127.0.0.1:8091`, and run the sidecar beside `pnpm run dev`.

The management token above is deliberately checked-in, non-sensitive seed data. It cannot authorize a production merchant. The explicit IPv4 address matches the server bind and avoids accidentally reaching another local service through `localhost`/IPv6.

The seed borrows the real `double-chicken-please` / `main` identity plus fictional bars, but it is a small deterministic dataset—not a production export. Global matching searches active items across active merchants and published menus. Venue-specific matching searches only the route's merchant/menu.

Manual state URLs:

- normal: `/m/double-chicken-please/main`
- menu missing: `/m/double-chicken-please/missing`
- menu unpublished: `/m/double-chicken-please/unpublished`
- merchant missing: `/m/missing/main`
- merchant inactive: `/m/inactive-venue/main`

## Venue backend (manage v2)

The account-based venue backend at `/venue` covers the Venue MVP loop; `/manage` redirects to this canonical entry while legacy `/manage/:token` links remain supported. How you sign in depends on `AUTH_PROVIDER` (see [Authentication](#authentication)): with `none` (the local default) enter any non-empty account name — passwordless, as the login page states openly — where an existing name reopens its account and a new name creates a fresh one; with `supabase` you sign in with Google instead. Either way a new account lands on venue setup. From there, teams can create a venue, build a drink library (with AI-suggested flavor profile, base spirit, strength, and recommendation note that the venue reviews before saving), assemble menus from library drinks, publish (which auto-archives the previously published menu), and print a QR code. The QR encodes the stable `/m/<venue-slug>` URL, which always resolves to the currently published menu, so printed codes survive re-publishes.

Guests scanning the QR are counted as menu views; successful matches are recorded per drink; the match result card asks for a 1–5 star rating with an optional comment. The dashboard at `/venue/dashboard` aggregates usage, matches, feedback, most-matched drinks, and recent comments for Today / Last 7 days / Last 30 days.

Drinks are venue-level entities: one drink can appear on several menus, edits propagate everywhere, and deleting a drink warns about the menus that reference it. Deleting a menu never deletes drinks. The legacy private-token flow at `/manage/:token` remains available unchanged during the transition.

The venue backend always runs on Supabase. Locally, `pnpm db:reset` (and the test global setup) applies the reviewed migrations in [`infra/supabase/migrations/`](infra/supabase/migrations/) to the local stack; against the shared project they are applied manually after review. Public reads use the publishable client (`SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY`) and work without a privileged key. The venue backend and the legacy management flow additionally need the server-only `SUPABASE_SERVICE_ROLE_KEY`; without it they fail closed with `503` while public reads keep working. The runtime adapters never run migrations or seeds on their own.

## Authentication

`AUTH_PROVIDER` selects the identity scheme independently of which Supabase project the data layer points at, so Google sign-in can be exercised against the local stack's seed data.

| Value | Behaviour |
| --- | --- |
| `supabase` (default) | Supabase Auth on `/venue`: email/password always, plus Google when `AUTH_GOOGLE_ENABLED=true`. Requires `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` and `infra/supabase/migrations/0003_supabase_auth.sql` applied. `POST /v1/venue/session` (name login) then returns `400`. |
| `none` | Legacy passwordless account-name login, kept because tests still cover it. Anyone who guesses an account name gets in — local use only. |

Email/password needs nothing beyond the Supabase project itself, so it is the path that works against a bare local stack and in tests. Google additionally needs an OAuth client in Google Cloud and the Supabase dashboard; until `AUTH_GOOGLE_ENABLED=true` the button is hidden rather than shown broken.

The local seed ships one ready account — **`demo@vibetail.test` / `vibetail-demo`** — already attached to the Vibetail Taproom venue, so `/venue` lands straight on a populated dashboard after `pnpm db:reset`. It is the same `venue_accounts` row the `none` provider reaches as "Demo Bar". Credentials live in `fixtures/venue/menus.json` under `venues.accounts[].authUser`; the seed generator turns that block into the `auth.users` + `auth.identities` rows.

Guests and venue owners share one account row: owning a venue is just a non-null `merchant_id`. Consumer surfaces have **no sign-in entry point** — anonymous scanning, matching, and feedback are the whole guest flow. The `account_id` columns on `match_events` / `match_feedback` are still written when a signed-in venue owner browses a menu, and a guest entry point can be added later without schema work.

The browser reads publishable settings from `GET /v1/config` at runtime, so one client build works across environments; the Supabase JS SDK is loaded lazily and never ships in the main bundle. The browser sends the Supabase access token as `Authorization: Bearer`, and the server verifies it with `auth.getUser` behind a 60-second cache. `/auth/callback` is the fixed PKCE redirect target and must be on the Supabase redirect allowlist and the Google OAuth client's authorised redirect URIs.

Setup steps for a fresh Supabase project and Google OAuth client are in [`docs/operations/google-auth-setup.md`](docs/operations/google-auth-setup.md).

## Domain and deployment sequence

`/` is the route intended to become `https://vibetail.com`. During acceptance it stays on localhost or a Railway preview URL. After product acceptance, the next step is `staging.vibetail.com`; the apex `vibetail.com` is switched only after staging acceptance. Phase 2.5 makes no deployment or DNS changes.

The repository now includes a Railway staging configuration at [`railway.toml`](railway.toml). It builds the full workspace, starts the compiled Node server directly, and uses `/health` for deployment gating. Exact variables and online verification steps are documented in [`docs/operations/deployment.md`](docs/operations/deployment.md).

The private-token management flow is a deliberately narrow demo compatibility layer. Tokens are verified server-side, omitted from application logs, and authorize exactly one merchant. The long-term replacement is Supabase Auth plus merchant membership/RBAC; do not add team, billing, analytics, CMS, custom-domain, or broader token permissions to this adapter.

## Guardrails

- The browser never receives `SUPABASE_SERVICE_ROLE_KEY`, model keys, or sandbox credentials.
- Domain packages do not import vendor SDKs. Only provider adapter packages may do so.
- Model output selects an allowlisted item ID and explanation; database records remain canonical for item facts.
- Agent workflow state and checkpoints live outside sandbox memory/filesystem.
- Production migrations, deployments, DNS changes, and domain cutover require separate explicit approval.
- Runtime source and dependency manifests are checked in CI for forbidden Lovable coupling.
- No Lovable package, gateway, plugin, or runtime dependency is present.

See [reference audit](docs/architecture/reference-audit.md), [target architecture](docs/architecture/target-architecture.md), [integration boundaries](docs/architecture/integration-boundaries.md), and [provider boundaries](docs/architecture/provider-boundaries.md).

For an explicit distinction between implemented backend code, the current runtime configuration, and external services that are not yet connected, see [current system status](docs/architecture/current-system-status.md).
