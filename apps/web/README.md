# Web application

React platform and restaurant UI plus the Express API composition root.

## Run locally

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm run dev
```

Open `http://127.0.0.1:3000/`. The explicit IPv4 host matches the server bind and avoids colliding with unrelated services listening through `localhost`/IPv6. Defaults are `RESTAURANT_REPOSITORY=fixture` and `MODEL_PROVIDER=deterministic`, so no credentials are required.

The API boundary is:

- `GET /v1/restaurants/:merchantSlug/menus/:menuSlug`
- `POST /v1/restaurants/:merchantSlug/menus/:menuSlug/match`
- `GET /v1/restaurants`
- `GET /v1/restaurants/:merchantSlug`
- `POST /v1/matches/global`
- `/v1/management/*` with a server-validated bearer token

The temporary view lives under `src/features/restaurant-legacy`; the route only composes it. See that directory's README for deletion and compatibility rules.

## Manual fixture matrix

| State | URL / action |
| --- | --- |
| Normal input/loading/result/retry | `/m/double-chicken-please/main` |
| Validation | Start the normal flow and submit with no mood/flavor |
| Empty menu | `/m/double-chicken-please/empty` |
| No active items | `/m/double-chicken-please/no-active` |
| Match provider failure | `/m/double-chicken-please/matching-failure`, then submit |
| Menu not found | `/m/double-chicken-please/missing` |
| Menu unpublished | `/m/double-chicken-please/unpublished` |
| Merchant not found | `/m/missing/main` |
| Merchant inactive | `/m/inactive-restaurant/main` |
| Landing | `/` |
| Global match | `/match` |
| Active bar directory | `/restaurants` |
| Second restaurant | `/m/nightjar-demo/cocktails` |
| Management | `/manage/fixture-double-chicken-demo` |

`fixture-double-chicken-demo` and `fixture-nightjar-demo-token` are public, local-only fixture tokens. Real private tokens belong only in private links and the request Authorization header; application logs must never contain them.

`RESTAURANT_REPOSITORY=supabase` requires `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Runtime validation fails at startup when selected-provider configuration is incomplete. The service role is imported only by the server composition tree and is never exposed to client code.
