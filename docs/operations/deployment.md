# Deployment

## Supported service shape

Vibetail currently deploys as one standard Node web/API service. Railway Railpack installs the pinned pnpm toolchain, runs `pnpm build`, and starts `node apps/web/dist/server/index.js`. The server listens on Railway's injected `PORT` and defaults to `0.0.0.0` in production.

`GET /health` is a process liveness check and is the Railway deployment healthcheck. `GET /ready` checks the selected venue repository. In Supabase mode it performs a public repository query and returns `503` without leaking provider errors if the dependency is unavailable.

## Staging variables

Start with the deterministic fixture deployment:

```text
NODE_ENV=production
APP_URL=https://<generated-domain>
VENUE_REPOSITORY=fixture
MODEL_PROVIDER=deterministic
SANDBOX_PROVIDER=local
LOG_LEVEL=info
```

Railway supplies `PORT`. `HOST` may be omitted because production defaults to `0.0.0.0`.

`RESTAURANT_REPOSITORY` is a deprecated alias for `VENUE_REPOSITORY`; existing Railway configurations that still set it keep working, but new configurations should use `VENUE_REPOSITORY`.

After fixture verification, Supabase public-read staging requires these Railway Variables:

```text
VENUE_REPOSITORY=supabase
SUPABASE_URL=<project URL>
SUPABASE_PUBLISHABLE_KEY=<publishable or legacy anon key>
```

To enable the temporary legacy management flow, additionally configure `SUPABASE_SERVICE_ROLE_KEY` with a server-only secret or legacy `service_role` key. Without it, public reads remain available while all management operations fail closed with `503`.

To enable AI-written match copy through OpenRouter, configure the server-only variables below and redeploy:

```text
MODEL_PROVIDER=openrouter
MODEL_NAME=openai/gpt-5-mini
OPENROUTER_API_KEY=<OpenRouter API key>
```

The adapter uses OpenRouter's OpenAI-compatible Chat Completions endpoint with strict Structured Outputs, bounded retry, minimal reasoning effort, short output, and a 20-second request budget. Provider routing requires support for every requested parameter and sets `data_collection=deny`. The model receives only server-built eligible candidates and preferences. It may return only `matchedItemId` and `whyThisMatch`; the venue service then revalidates the ID against the current menu and reconstructs all canonical item facts from the repository. `openai/gpt-5-mini` is the initial low-cost baseline because OpenRouter currently reports Structured Outputs support for it; change `MODEL_NAME` only after representative quality, latency, and cost evaluation.

The direct OpenAI adapter remains available with `MODEL_PROVIDER=openai`, `MODEL_NAME`, and `MODEL_API_KEY`. Do not reuse an OpenRouter key in `MODEL_API_KEY`; the separate names make provider selection and secret rotation explicit.

## XPRIZE Vertex Tasting Agent preview

Deploy the XPRIZE branch to a separate Railway preview environment/service so the existing healthy staging service remains recoverable. This action requires explicit deployment approval and does not include a production migration or DNS change.

Configure:

```text
NODE_ENV=production
APP_URL=https://<xprize-preview>.up.railway.app
VENUE_REPOSITORY=supabase
MODEL_PROVIDER=vertex
MODEL_NAME=gemini-3.5-flash
GOOGLE_CLOUD_PROJECT=<project-id>
GOOGLE_CLOUD_LOCATION=global
SANDBOX_PROVIDER=local
LOG_LEVEL=info
VERTEX_API_KEY=<sealed server-only Express Mode key>
SUPABASE_URL=<approved existing value>
SUPABASE_PUBLISHABLE_KEY=<approved existing value>
```

Do not add `VERTEX_API_KEY` to a `VITE_` variable, repository file, build log, screenshot, or browser runtime config. Seal it in the Railway service. The service starts without making a Gemini request; `/health` gates process activation and `/ready` checks the venue repository. Run the real Vertex canary only after both return 200.

Release smoke tests must prove that the preview contains the current `/v1/venues` revision, not the older `/v1/restaurants` deployment. Record one global, one venue-specific English, and one venue-specific Chinese/different-preference match. Correlate each response trace ID with a sanitized Railway `tasting_agent_request_completed` event and the Vertex usage time window.

Rollback on authentication failure, invalid selection, secret exposure, missing current routes, failed health/readiness, or unacceptable latency. Rotate the Vertex key first if exposure is suspected, then restore the previous successful Railway deployment or route evaluation back to the untouched staging service.

Do not paste secrets into logs, commits, public variables, browser code, or deployment URLs. Before enabling management writes, verify the old schema, RLS, `published_version_id`, and SHA-256 private-token format using a dedicated test merchant.

## Release verification

For every generated staging URL verify:

1. `/health` returns `200`.
2. `/ready` returns `200` and identifies the expected repository.
3. `/`, `/match`, and `/venues` render without console errors.
4. `/m/double-chicken-please/main` renders and completes a match.
5. The fixture management page authorizes only with the documented fixture token.
6. Unknown API routes return structured JSON rather than the SPA.
7. Logs contain no authorization header or secret.
8. When a remote model provider is selected, a result has non-template match copy and still resolves to a current allowlisted item.

The generated Railway domain is the acceptance target. `staging.vibetail.com` is connected only after acceptance, and `vibetail.com` is not changed without a separate reviewed cutover.
