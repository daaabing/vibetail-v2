# Vibetail

Vibetail helps restaurants turn a guest's mood into a personalized real-menu recommendation, while an AI agent safely builds and operates the experience inside an isolated, resumable sandbox.

This repository is the long-term source of truth. The previous Lovable repository is a read-only product and data reference; it is not a runtime, package, build, or deployment dependency.

## Phase 2.5 core product migration

The repository now contains Vibetail's runnable product spine: a landing page, global matching across active bars, a bar directory, restaurant-specific matching, and a minimal private-link management loop. Both match scopes use the same preference contract, candidate validation, provider, and canonicalization logic. Agent workflows and live FC/E2B integration remain intentionally deferred until Phase 3.

```text
apps/
  web/                 React platform/restaurant UI and Express API composition root
  agent-worker/        background agent execution composition root
packages/
  contracts/           versioned runtime schemas and shared TypeScript types
  restaurant-core/     restaurant repositories, matching use cases, validation
  agent-core/          durable workflow persistence ports
  sandbox-runtime/     provider-neutral sandbox lifecycle
  provider-fc/         Alibaba FC adapter boundary (implementation deferred)
  provider-e2b/        E2B adapter boundary (implementation deferred)
  model-providers/     provider-neutral model selection boundary
  observability/       structured telemetry contracts
infra/                 reviewed deployment assets only; no production state
fixtures/              deterministic demo and test inputs
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
pnpm test
pnpm build
```

The checked-in defaults use fixture restaurant data, a deterministic model, and the local sandbox. Empty optional credentials are normalized as absent. Selecting `supabase`, `fc`, `e2b`, or a remote model provider makes that provider's required variables mandatory at startup. The preferred remote model selection is `MODEL_PROVIDER=openrouter`, `MODEL_NAME=openai/gpt-5-mini`, and a server-only `OPENROUTER_API_KEY`.

## Local product walkthrough

No external credentials are needed for the default path:

```sh
pnpm run dev
```

Use these exact fixture-mode URLs:

- Landing: [http://127.0.0.1:3000/](http://127.0.0.1:3000/)
- Global match: [http://127.0.0.1:3000/match](http://127.0.0.1:3000/match)
- Explore bars: [http://127.0.0.1:3000/restaurants](http://127.0.0.1:3000/restaurants)
- Double Chicken Please experience: [http://127.0.0.1:3000/m/double-chicken-please/main](http://127.0.0.1:3000/m/double-chicken-please/main)
- Nightjar experience: [http://127.0.0.1:3000/m/nightjar-demo/cocktails](http://127.0.0.1:3000/m/nightjar-demo/cocktails)
- Management demo: [http://127.0.0.1:3000/manage/fixture-double-chicken-demo](http://127.0.0.1:3000/manage/fixture-double-chicken-demo)

The management token above is deliberately checked-in, non-sensitive fixture data. It cannot authorize a production merchant. The explicit IPv4 address matches the server bind and avoids accidentally reaching another local service through `localhost`/IPv6.

The fixture uses the old seed's real `double-chicken-please` / `main` identity plus a second fictional bar, but it is a small deterministic test fixture—not a production export. Global matching searches active items across active merchants and published menus. Restaurant-specific matching searches only the route's merchant/menu.

Manual state URLs:

- normal: `/m/double-chicken-please/main`
- empty published menu: `/m/double-chicken-please/empty`
- no active items: `/m/double-chicken-please/no-active`
- deterministic matching failure with retry: `/m/double-chicken-please/matching-failure`
- menu missing: `/m/double-chicken-please/missing`
- menu unpublished: `/m/double-chicken-please/unpublished`
- merchant missing: `/m/missing/main`
- merchant inactive: `/m/inactive-restaurant/main`

Set `RESTAURANT_REPOSITORY=supabase` with valid `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Public reads use the publishable client and continue to work without a privileged key. Add the server-only `SUPABASE_SERVICE_ROLE_KEY` only when the legacy management flow is intentionally enabled; otherwise management APIs fail closed with `503`. These adapters never run migrations or seeds.

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
- The temporary old-UI adaptation is isolated in `apps/web/src/features/restaurant-legacy` with an explicit deletion marker and compatibility mapper.
- No Lovable package, gateway, plugin, or runtime dependency is present.

See [reference audit](docs/architecture/reference-audit.md), [target architecture](docs/architecture/target-architecture.md), [integration boundaries](docs/architecture/integration-boundaries.md), and [provider boundaries](docs/architecture/provider-boundaries.md).

For an explicit distinction between implemented backend code, the current fixture/deterministic runtime, and external services that are not yet connected, see [current system status](docs/architecture/current-system-status.md).
