# Google sign-in via Supabase Auth

**You only need this for Google.** `AUTH_PROVIDER=supabase` already gives the
venue backend working email/password sign-in with no external setup at all —
including the seeded `demo@vibetail.test` / `vibetail-demo` account on the local
stack. Follow this document only when you also want the Google button, which
is hidden until `AUTH_GOOGLE_ENABLED=true`.

Everything below happens in the Supabase and Google consoles — the app cannot
create these for you.

## 1. Supabase project

1. Create a project at <https://supabase.com/dashboard> (or reuse an existing one).
2. Copy **Project Settings → API**:
   - Project URL → `SUPABASE_URL`
   - Publishable / `anon` key → `SUPABASE_PUBLISHABLE_KEY`
   - Service role key → `SUPABASE_SERVICE_ROLE_KEY` (server only; required for
     the venue backend to do anything beyond public reads)

## 2. Google OAuth client

In <https://console.cloud.google.com/>:

1. Create or pick a project.
2. **APIs & Services → OAuth consent screen**: External, fill app name and
   support email, and add your account under Test users while the app is in
   Testing. Scopes: the defaults (`email`, `profile`, `openid`) are enough.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**,
   type **Web application**.
4. Authorised redirect URI — this is the **Supabase** callback, not the app's:

   ```
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

5. Copy the **Client ID** and **Client secret**.

## 3. Connect the two

In the Supabase dashboard:

1. **Authentication → Sign In / Providers → Google**: enable it, paste the
   Client ID and Client secret, save.
2. **Authentication → URL Configuration**:
   - Site URL: your app origin, e.g. `http://127.0.0.1:3000` for local work.
   - Redirect URLs: add every app origin's callback —

     ```
     http://127.0.0.1:3000/auth/callback
     https://staging.vibetail.com/auth/callback
     https://vibetail.com/auth/callback
     ```

   `/auth/callback` is fixed in the client (see `App.tsx`); the entry is
   rejected silently at sign-in time if it is missing here.

## 4. Database

Apply [`infra/supabase/migrations/0003_supabase_auth.sql`](../../infra/supabase/migrations/0003_supabase_auth.sql)
manually, after `0002_venue_mvp.sql`. Per `AGENTS.md`, migrations are never applied
automatically. Run its verification checklist against staging first.

## 5. App environment

```
AUTH_PROVIDER=supabase
AUTH_GOOGLE_ENABLED=true
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
APP_URL=http://127.0.0.1:3000
```

`APP_URL` must match the origin you browse, because the callback redirect is
built from `window.location.origin` and has to be on the allowlist above.

Venue data always persists to the Supabase project that `SUPABASE_URL` points
at; there is no separate in-memory mode.

## Local stack variant

The same OAuth client also works against `pnpm db:start`: uncomment the
`[auth.external.google]` block in `infra/supabase/config.toml`, export
`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `..._SECRET`, restart the stack,
and add `http://127.0.0.1:54321/auth/v1/callback` to the Google client's
authorised redirect URIs alongside the hosted one.

## 6. Verify

```bash
curl -s http://127.0.0.1:3000/v1/config
```

Expect `{"auth":{"provider":"supabase","supabaseUrl":"…","supabasePublishableKey":"…"}}`
and no service-role key. Then open `/venue` — it should show **Continue with
Google** instead of the account-name form.

## Notes and limits

- **Existing passwordless venues do not carry over.** A venue created through
  the old name login is not linked to any Google identity, so the owner's first
  Google sign-in creates an empty account. The migration file documents the
  manual `update` that hands the existing venue to their identity.
- **Token verification cost.** The server calls `auth.getUser` and caches the
  result for 60 seconds per token, so a sign-out takes up to a minute to stop
  authorising in-flight API calls. Access tokens themselves are refreshed by the
  browser SDK. If per-request latency ever matters, the cache can be replaced
  with local JWKS verification once the project uses asymmetric signing keys.
- **Adding more providers.** `SupabaseIdentityVerifier` is behind the
  `IdentityVerifier` port in `packages/venue-core/src/identity.ts`; enabling
  Apple or GitHub in the Supabase dashboard needs only a new button in the UI,
  no server change.
