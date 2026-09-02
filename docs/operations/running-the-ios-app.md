# Running the iOS app

The iOS app is the mobile shell at `/app` (two tabs + a plus button), served
by the normal Vibetail web server and wrapped by a Capacitor iOS project in
`apps/web/ios/`. There is no separate mobile backend: the shell talks to the
same-origin `/v1` API.

## TL;DR

```sh
pnpm db:start     # local Supabase stack (Docker Desktop + Supabase CLI)
pnpm dev          # web server; then open http://127.0.0.1:3000/app
```

First time on a fresh checkout: `cp .env.example .env`, `pnpm install
--frozen-lockfile`, then copy `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and
`SUPABASE_SERVICE_ROLE_KEY` from `pnpm db:status` into `.env` (see the README's
*Local setup*).

> **Worktree note:** each task worktree runs an isolated Supabase stack on its
> own ports (a local, uncommitted `infra/supabase/config.toml` + `.env` edit).
> `pnpm db:status` in *your* worktree always tells you the right values; don't
> assume 54321/3000.

## In the browser

`http://127.0.0.1:<PORT>/app` — use a phone-sized viewport (375×812) for the
intended experience. Useful bits:

- **Explore** asks for location permission. Bars sort nearest-first only once
  `merchants.latitude/longitude` are populated (migration `0005_merchant_geo`);
  the seeded demo bars carry NYC coordinates out of the box.
- **Calendar / Record a drink**: signed out, entries stay in the browser's
  IndexedDB. Signed in, the journal syncs through `/v1/me/drink-logs`
  (migration `0006_drink_logs`), and the calendar offers a one-tap upload of
  any entries still on the device.
- Demo sign-in (seeded): `demo@vibetail.test` / `vibetail-demo` via the
  profile sheet → *Sign in to sync*.

## In the iOS Simulator (Capacitor)

Requires Xcode (full install from the App Store — the Command Line Tools alone
cannot build; check with `xcodebuild -version`).

```sh
cd apps/web
npx cap sync ios
npx cap open ios    # then ⌘R on a simulator
```

The wrapper's webview loads the *running dev server* (`capacitor.config.ts`
defaults to `http://127.0.0.1:3000/app`), so `pnpm dev` must be up. The
simulator shares the host network, so `127.0.0.1` just works. If your worktree
serves on a different port, point the shell at it:

```sh
CAP_SERVER_URL=http://127.0.0.1:3400/app npx cap sync ios
```

## On a physical iPhone

1. Serve on all interfaces: set `HOST=0.0.0.0` in `.env` and restart `pnpm dev`.
2. Re-sync the shell against your Mac's LAN IP:
   `CAP_SERVER_URL=http://<your-lan-ip>:<port>/app npx cap sync ios`.
3. In Xcode, select your device, set a development team under
   *Signing & Capabilities*, and run.

`cleartext` is enabled automatically for `http://` URLs — that is a dev
convenience only. A distributable build must point `CAP_SERVER_URL` at an
https deployment (staging), which also keeps Google OAuth happy: the redirect
flow lands on the origin in the server's `APP_URL`, so sign-in inside the
wrapper needs the wrapper and `APP_URL` to agree.

## Troubleshooting

- **Directory empty / 401s out of nowhere** — another session may have reset
  a *shared* stack. In an isolated worktree stack, re-check `pnpm db:status`
  and that `.env` matches its ports.
- **UI looks stale or API 404s** — a leftover `pnpm dev` from another
  worktree may own the port; kill stray `tsx apps/web/src/server` processes
  and restart, or you'll get a new frontend talking to an old server.
- **`xcodebuild: error: tool requires Xcode`** — `xcode-select` points at the
  Command Line Tools; install Xcode, then
  `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
- **Simulator loads a white page** — the dev server isn't running, or the
  wrapper was synced against a different port; re-run `npx cap sync ios` with
  the right `CAP_SERVER_URL`.
