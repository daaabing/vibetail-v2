# Deployment

## Supported service shape

Vibetail currently deploys as one standard Node web/API service. Railway Railpack installs the pinned pnpm toolchain, runs `pnpm build`, and starts `node apps/web/dist/server/index.js`. The server listens on Railway's injected `PORT` and defaults to `0.0.0.0` in production.

`GET /health` is a process liveness check and is the Railway deployment healthcheck. `GET /ready` checks the selected restaurant repository. In Supabase mode it performs a public repository query and returns `503` without leaking provider errors if the dependency is unavailable.

## Staging variables

Start with the deterministic fixture deployment:

```text
NODE_ENV=production
APP_URL=https://<generated-domain>
RESTAURANT_REPOSITORY=fixture
MODEL_PROVIDER=deterministic
SANDBOX_PROVIDER=local
LOG_LEVEL=info
```

Railway supplies `PORT`. `HOST` may be omitted because production defaults to `0.0.0.0`.

After fixture verification, Supabase public-read staging requires these Railway Variables:

```text
RESTAURANT_REPOSITORY=supabase
SUPABASE_URL=<project URL>
SUPABASE_PUBLISHABLE_KEY=<publishable or legacy anon key>
```

To enable the temporary legacy management flow, additionally configure `SUPABASE_SERVICE_ROLE_KEY` with a server-only secret or legacy `service_role` key. Without it, public reads remain available while all management operations fail closed with `503`.

To enable AI-written match copy through OpenAI, configure the server-only variables below and redeploy:

```text
MODEL_PROVIDER=openai
MODEL_NAME=gpt-5.6-terra
MODEL_API_KEY=<OpenAI project API key>
```

The adapter uses the Responses API with Structured Outputs, low reasoning effort, short output, an 8-second request budget, and `store: false`. The model receives only server-built eligible candidates and preferences. It may return only `matchedItemId` and `whyThisMatch`; the restaurant service then revalidates the ID against the current menu and reconstructs all canonical item facts from the repository. `gpt-5.6-terra` is the initial quality/cost recommendation for this bounded task; change `MODEL_NAME` only after representative quality, latency, and cost evaluation.

Do not paste secrets into logs, commits, public variables, browser code, or deployment URLs. Before enabling management writes, verify the old schema, RLS, `published_version_id`, and SHA-256 private-token format using a dedicated test merchant.

## Release verification

For every generated staging URL verify:

1. `/health` returns `200`.
2. `/ready` returns `200` and identifies the expected repository.
3. `/`, `/match`, and `/restaurants` render without console errors.
4. `/m/double-chicken-please/main` renders and completes a match.
5. The fixture management page authorizes only with the documented fixture token.
6. Unknown API routes return structured JSON rather than the SPA.
7. Logs contain no authorization header or secret.
8. When `MODEL_PROVIDER=openai`, a result has non-template match copy and still resolves to a current allowlisted item.

The generated Railway domain is the acceptance target. `staging.vibetail.com` is connected only after acceptance, and `vibetail.com` is not changed without a separate reviewed cutover.
