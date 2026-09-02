# Deployment

## Supported service shape

Vibetail currently deploys as one standard Node web/API service. Railway Railpack installs the pinned pnpm toolchain, runs `pnpm build`, and starts `node apps/web/dist/server/index.js`. The server listens on Railway's injected `PORT` and defaults to `0.0.0.0` in production.

`GET /health` is a process liveness check and is the Railway deployment healthcheck. `GET /ready` performs a public Supabase repository query and returns `503` without leaking provider errors if the dependency is unavailable.

## Staging variables

Venue data always lives in Supabase, so every deployment must configure the `SUPABASE_*` variables — there is no fixture fallback:

```text
NODE_ENV=production
APP_URL=https://<generated-domain>
SUPABASE_URL=<project URL>
SUPABASE_PUBLISHABLE_KEY=<publishable or legacy anon key>
MODEL_PROVIDER=deterministic
SANDBOX_PROVIDER=local
LOG_LEVEL=info
```

Railway supplies `PORT`. `HOST` may be omitted because production defaults to `0.0.0.0`.
The production server now rejects a loopback `APP_URL` such as `http://127.0.0.1:3000`, so missing this variable fails fast instead of generating localhost OAuth callbacks.

To enable the venue backend and the temporary legacy management flow, additionally configure `SUPABASE_SERVICE_ROLE_KEY` with a server-only secret or legacy `service_role` key. Without it, public reads remain available while all management operations fail closed with `503`.

To enable AI-written match copy through OpenRouter, configure the server-only variables below and redeploy:

```text
MODEL_PROVIDER=openrouter
MODEL_NAME=openai/gpt-5-mini
OPENROUTER_API_KEY=<OpenRouter API key>
```

The adapter uses OpenRouter's OpenAI-compatible Chat Completions endpoint with strict Structured Outputs, bounded retry, minimal reasoning effort, short output, and a 20-second request budget. Provider routing requires support for every requested parameter and sets `data_collection=deny`. The model receives only server-built eligible candidates and preferences. It may return only `matchedItemId` and `whyThisMatch`; the venue service then revalidates the ID against the current menu and reconstructs all canonical item facts from the repository. `openai/gpt-5-mini` is the initial low-cost baseline because OpenRouter currently reports Structured Outputs support for it; change `MODEL_NAME` only after representative quality, latency, and cost evaluation.

The direct OpenAI adapter remains available with `MODEL_PROVIDER=openai`, `MODEL_NAME`, and `MODEL_API_KEY`. Do not reuse an OpenRouter key in `MODEL_API_KEY`; the separate names make provider selection and secret rotation explicit.

To enable automatic background removal on venue drink photos (the "Prepare photo" action), configure:

```text
IMAGE_CUTOUT_PROVIDER=replicate-sam2
REPLICATE_API_TOKEN=<Replicate API token>
```

This is the hosted equivalent of the local SAM 2 sidecar: `tmappdev/lang-segment-anything` on Replicate (GroundingDINO + SAM 2.1, ~$0.0014 per prediction, ~1 s warm) locates the complete assembled drink with one compact semantic prompt. Its 48 targets cover representative cocktail and mocktail vessels, ice and foam, broad fruit/citrus/herbal/savory/spice/floral/dessert garnish families, decorated rims, and important concrete examples such as cherries, mint, picks, skewers, stirrers, straws, and umbrellas. A longer 130-target prompt is not used because the hosted model fails beyond its detector caption limit. The vocabulary deliberately excludes unattached bar tools and bottles so background props do not become the main subject. LangSAM encodes separate detected instances at different non-zero grayscale values; the server unions all of those values before filling holes, keeping the main vessel plus spatially associated components above its rim, rejecting loose table props, checking the silhouette, cropping it tightly, and compositing the mask as the alpha channel of the original pixels. Community model, so cold boots can add tens of seconds — the first request after idle may time out and succeed on retry. Override with `IMAGE_CUTOUT_MODEL` (`owner/name:versionhash` for community models, `owner/name` for official ones); any model that returns a single grayscale mask image works. The photo is uploaded through Replicate's Files API (their data-URI path caps well below our 8 MB input limit) and the result is stored in Supabase immediately because Replicate deletes prediction outputs after an hour.

The local no-billing option (`IMAGE_CUTOUT_PROVIDER=sam2`) needs the sidecar in `services/sam2-cutout`, which has no hosted deployment.

Do not paste secrets into logs, commits, public variables, browser code, or deployment URLs. Before enabling management writes, verify the old schema, RLS, `published_version_id`, and SHA-256 private-token format using a dedicated test merchant.

## Schema migrations

`infra/supabase/migrations/` is the source of truth for the remote schema. The
`migrate-staging` job in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)
runs `supabase db push --linked` after `validate` passes on `main`, so schema
changes land with the code that needs them instead of by hand in the SQL editor.

The job needs a `staging` GitHub Environment holding:

```text
secrets.SUPABASE_ACCESS_TOKEN   personal access token from the Supabase dashboard
secrets.SUPABASE_DB_PASSWORD    the linked project's database password
vars.SUPABASE_PROJECT_REF       e.g. dzabqqybqmrjxxrmziyf
```

Seed data is never pushed: `db push` includes it only behind `--include-seed`,
which this job does not pass. `infra/supabase/config.toml` describes the local
test stack only — the hosted project's own settings (email confirmation, OAuth
providers, SMTP) live in the Supabase dashboard and are not managed here.

Migrations must be backward compatible; see the rule in
[`AGENTS.md`](../../AGENTS.md) for why, and what a column drop requires.

### One-time history repair

The staging project's baseline was applied by hand, so its migration history
table was empty while the schema was already current. Pushing against an empty
history would have replayed `0000_baseline.sql` and failed on `create table`.
The history was therefore aligned once, without touching the schema:

```bash
supabase --workdir infra link --project-ref <ref>
supabase --workdir infra migration repair --status applied 0000 0001 0002 0003 0004
supabase --workdir infra migration list   # every local version now matches remote
```

Any future project that starts from a hand-applied schema needs the same repair
before CI can push to it. Verify the schema really is current first — repairing
past a migration that never ran skips it permanently.

## Release verification

For every generated staging URL verify:

1. `/health` returns `200`.
2. `/ready` returns `200` and identifies the expected repository.
3. `/`, `/match`, and `/venues` render without console errors.
4. `/m/double-chicken-please/main` renders and completes a match.
5. The legacy management page authorizes only with a valid private token.
6. Unknown API routes return structured JSON rather than the SPA.
7. Logs contain no authorization header or secret.
8. When a remote model provider is selected, a result has non-template match copy and still resolves to a current allowlisted item.

The generated Railway domain is the acceptance target. `staging.vibetail.com` is connected only after acceptance, and `vibetail.com` is not changed without a separate reviewed cutover.
