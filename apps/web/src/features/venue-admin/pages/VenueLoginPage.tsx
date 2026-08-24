import { useEffect, useState, type FormEvent } from "react";
import type { AuthConfig } from "@vibetail/contracts";
import { HttpVenueManagementClient } from "../../../clients/http-venue-management-client.js";
import {
  getAccessToken,
  loadAuthConfig,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "../../auth/auth-session.js";
import { SiteFooter, SiteHeader } from "../../platform/components/SiteHeader.js";
import { useSeo } from "../../platform/useSeo.js";
import { VenueClientError } from "../../../clients/http-venue-client.js";
import { errorMessage } from "../VenueShell.js";
import { clearVenueToken, readCachedVenueSession, saveCachedVenueSession, saveVenueToken } from "../session-store.js";

function destinationFor(hasVenue: boolean): string {
  return hasVenue ? "/venue/dashboard" : "/venue/setup";
}

export function VenueLoginPage() {
  useSeo("Venue sign in — Vibetail", "Enter the Vibetail venue backend.", true);
  const [config, setConfig] = useState<AuthConfig>();
  const [checking, setChecking] = useState(true);
  // Which submit is in flight. One flag disables every control, but labels
  // must only animate on the button that was actually pressed.
  const [pendingAction, setPendingAction] = useState<null | "name" | "email" | "google">(null);
  const pending = pendingAction !== null;
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [notice, setNotice] = useState("");
  const [configFailed, setConfigFailed] = useState(false);

  // An existing session skips the form entirely, whichever provider issued it.
  useEffect(() => {
    // A cached snapshot means this browser was signed in moments ago: jump
    // straight to the backend and let the admin page's background check
    // re-verify. A dead credential bounces back here with the cache already
    // cleared, so this cannot loop.
    const cached = readCachedVenueSession();
    if (cached) {
      window.location.replace(destinationFor(Boolean(cached.venue)));
      return;
    }
    let active = true;
    void (async () => {
      try {
        const loaded = await loadAuthConfig();
        if (active) setConfig(loaded);
      } catch {
        // Without the config we cannot know which form applies; rendering the
        // name form on a Supabase deployment would 400 on submit, so fail
        // visibly instead of guessing.
        if (active) {
          setConfigFailed(true);
          setChecking(false);
        }
        return;
      }
      try {
        const token = await getAccessToken();
        if (!token) {
          if (active) setChecking(false);
          return;
        }
        const session = await new HttpVenueManagementClient(token).getSession();
        // Seed the snapshot so the admin page we land on renders instantly.
        saveCachedVenueSession(session);
        if (active) window.location.replace(destinationFor(Boolean(session.venue)));
      } catch (caught) {
        // Only a definitive 401 may wipe the stored credential; a network blip
        // or 5xx shows the form again without signing the merchant out.
        if (caught instanceof VenueClientError && caught.status === 401) clearVenueToken();
        if (active) setChecking(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function submitName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (!name) return;
    setPendingAction("name");
    setError("");
    try {
      const result = await new HttpVenueManagementClient().login({ name });
      saveVenueToken(result.token);
      saveCachedVenueSession(result.session);
      window.location.assign(destinationFor(Boolean(result.session.venue)));
    } catch (caught) {
      setError(errorMessage(caught));
      setPendingAction(null);
    }
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!email || !password) return;
    setPendingAction("email");
    setError("");
    setNotice("");
    try {
      if (mode === "signup") {
        const outcome = await signUpWithEmail(email, password);
        if (outcome === "already_registered") {
          // No confirmation email is coming for an existing address; saying
          // "check your inbox" would strand the merchant.
          setError("This email already has an account. Sign in with your password instead.");
          setMode("signin");
          setPendingAction(null);
          return;
        }
        if (outcome === "confirm_email") {
          setNotice("Check your inbox and confirm the address, then sign in.");
          setMode("signin");
          setPendingAction(null);
          return;
        }
      } else {
        await signInWithEmail(email, password);
      }
      // The session decides the landing page; a fresh account has no venue yet.
      const session = await new HttpVenueManagementClient(await getAccessToken()).getSession();
      saveCachedVenueSession(session);
      window.location.assign(destinationFor(Boolean(session.venue)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : errorMessage(caught));
      setPendingAction(null);
    }
  }

  async function submitGoogle() {
    setPendingAction("google");
    setError("");
    setNotice("");
    try {
      // Redirects away; control only returns here if the handshake failed to start.
      await signInWithGoogle("/venue/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Google sign-in could not be started.");
      setPendingAction(null);
    }
  }

  if (checking) {
    return <div className="vt-page"><SiteHeader /><main className="vt-narrow"><p className="vt-loading">Checking your venue session…</p></main></div>;
  }

  return (
    <div className="vt-page">
      <SiteHeader />
      <main className="vt-narrow">
        <header className="vt-page-title">
          <p className="vt-kicker">Venue backend</p>
          <h1>Run your bar on Vibetail.</h1>
          <p>Build your drink library, publish a menu, print one QR code, and watch matches and feedback arrive.</p>
        </header>
        {configFailed ? (
          <section className="vt-management-entry">
            <div className="vt-alert" role="alert">Sign-in options could not be loaded. Check your connection and retry.</div>
            <button className="vt-primary" type="button" onClick={() => window.location.reload()}>Retry</button>
          </section>
        ) : (
        <section className="vt-management-entry">
          {config?.provider === "supabase" ? (
            <>
              <p>{mode === "signup" ? "Create your venue account" : "Sign in to your venue account"}</p>
              <form className="vt-admin-form" onSubmit={submitEmail}>
                <label>
                  Email
                  <input name="email" type="email" required maxLength={320} autoComplete="username" />
                </label>
                <label>
                  Password
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    maxLength={200}
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  />
                </label>
                <button className="vt-primary" type="submit" disabled={pending}>
                  {pendingAction === "email" ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
                </button>
              </form>
              <button
                className="vt-link-button"
                type="button"
                disabled={pending}
                onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); setNotice(""); }}
              >
                {mode === "signup" ? "I already have an account" : "Create a new account"}
              </button>
              <button className="vt-secondary" type="button" disabled={pending} onClick={() => void submitGoogle()}>
                {pendingAction === "google" ? "Redirecting…" : "Continue with Google"}
              </button>
              {notice && <div className="vt-notice">{notice}</div>}
              <small>
                Guests and venue owners share one Vibetail account. You become a venue
                owner once you create a venue.
              </small>
            </>
          ) : (
            <>
              <p>Enter your account name</p>
              <form className="vt-admin-form" onSubmit={submitName}>
                <label>
                  Account name
                  <input name="name" required minLength={1} maxLength={80} placeholder="e.g. Nightjar Team" autoComplete="username" />
                </label>
                <button className="vt-primary" type="submit" disabled={pending}>
                  {pendingAction === "name" ? "Signing in…" : "Enter the backend"}
                </button>
              </form>
              <small>
                Local sign-in is passwordless: anyone who knows the account name can open it.
                A returning name reopens its venue; a new name starts a fresh account.
                Try the demo with “Demo Bar”.
              </small>
            </>
          )}
          {error && <div className="vt-alert" role="alert">{error}</div>}
        </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
