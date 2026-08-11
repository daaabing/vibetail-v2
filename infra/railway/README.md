# Railway

The root [`railway.toml`](../../railway.toml) is the deployable web/API service configuration. Railway uses Railpack, runs the monorepo build from the repository root, starts the compiled Node server directly, and gates new releases on `/health`.

Runtime secrets and environment-specific values remain in Railway Variables, never in this directory. No Railway volume or database is required; restaurant data is supplied by the selected repository provider.

See [`docs/operations/deployment.md`](../../docs/operations/deployment.md) for staging setup and verification.
