# Web application

React platform and venue UI plus the Express API composition root.

## Run locally

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm db:start   # local Supabase stack (requires Docker)
# copy SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY / SUPABASE_SERVICE_ROLE_KEY
# from `pnpm db:status` into the repo root .env
pnpm run dev
```

Open `http://127.0.0.1:3000/`. The explicit IPv4 host matches the server bind and avoids colliding with unrelated services listening through `localhost`/IPv6. The default `MODEL_PROVIDER=deterministic` needs no model credentials; the local Supabase stack supplies the data layer.

The API boundary is:

- `GET /v1/venues/:merchantSlug/menus/:menuSlug`
- `POST /v1/venues/:merchantSlug/menus/:menuSlug/match`
- `GET /v1/venues`
- `GET /v1/venues/:merchantSlug`
- `POST /v1/matches/global`
- `GET /v1/venues/:merchantSlug/current-menu` (stable QR target)
- `POST /v1/events/menu-views` and `POST /v1/matches/:matchId/feedback` (public consumer events)
- `/v1/venue/*` with a server-validated venue session bearer token (manage v2)
- `/v1/management/*` with a server-validated legacy private token

The guest-facing venue experience lives under `src/features/venue` and renders the canonical `VenueMatchResult` directly through `VenueClient`. The previous legacy view and compatibility mapper have been removed.

## Manual state matrix (seeded data)

| State | URL / action |
| --- | --- |
| Normal input/loading/result/retry | `/m/double-chicken-please/main` |
| Validation | Start the normal flow and submit with no mood/flavor |
| Menu not found | `/m/double-chicken-please/missing` |
| Menu unpublished | `/m/double-chicken-please/unpublished` |
| Merchant not found | `/m/missing/main` |
| Merchant inactive | `/m/inactive-venue/main` |
| Landing | `/` |
| Global match | `/match` |
| Active bar directory | `/venues` |
| Second venue | `/m/nightjar-demo/cocktails` |
| Venue backend (sign in as `Demo Bar`) | `/venue` |
| Stable QR target for the demo venue | `/m/vibetail-taproom` |
| Legacy management | `/manage/fixture-double-chicken-demo` |
| For bars | `/for-bars` |

`fixture-double-chicken-demo` and `fixture-nightjar-demo-token` are public, local-only demo tokens whose hashes ship in the seed data (do not rename them). Real private tokens belong only in private links and the request Authorization header; application logs must never contain them.

`SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` are always required for public reads. `SUPABASE_SERVICE_ROLE_KEY` is optional and enables the temporary legacy management boundary; without it, management fails closed with `503`. The preferred remote model path is `MODEL_PROVIDER=openrouter` with server-only `OPENROUTER_API_KEY` and `MODEL_NAME` (initial baseline: `openai/gpt-5-mini`). The direct `openai` adapter remains available with `MODEL_API_KEY`. Runtime validation fails at startup when selected-provider configuration is incomplete. Service-role and model secrets are imported only by the server composition tree and are never exposed to client code.
