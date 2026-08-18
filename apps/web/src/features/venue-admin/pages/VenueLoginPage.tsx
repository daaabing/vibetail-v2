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
import { errorMessage } from "../VenueShell.js";
import { clearVenueToken, saveVenueToken } from "../session-store.js";

function destinationFor(hasVenue: boolean): string {
  return hasVenue ? "/venue/dashboard" : "/venue/setup";
}

export function VenueLoginPage() {
  useSeo("Venue sign in — Vibetail", "Enter the Vibetail venue backend.", true);
  const [config, setConfig] = useState<AuthConfig>();
  const [checking, setChecking] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [notice, setNotice] = useState("");

  // An existing session skips the form entirely, whichever provider issued it.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const loaded = await loadAuthConfig();
        if (active) setConfig(loaded);
        const token = await getAccessToken();
        if (!token) {
          if (active) setChecking(false);
          return;
        }
        const session = await new HttpVenueManagementClient(token).getSession();
        if (active) window.location.replace(destinationFor(Boolean(session.venue)));
      } catch {
        clearVenueToken();
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
    setPending(true);
    setError("");
    try {
      const result = await new HttpVenueManagementClient().login({ name });
      saveVenueToken(result.token);
      window.location.assign(destinationFor(Boolean(result.session.venue)));
    } catch (caught) {
      setError(errorMessage(caught));
      setPending(false);
    }
  }

  async function submitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    if (!email || !password) return;
    setPending(true);
    setError("");
    setNotice("");
    try {
      if (mode === "signup") {
        const signedIn = await signUpWithEmail(email, password);
        if (!signedIn) {
          // Projects with email confirmation on issue no session yet.
          setNotice("Check your inbox and confirm the address, then sign in.");
          setMode("signin");
          setPending(false);
          return;
        }
      } else {
        await signInWithEmail(email, password);
      }
      // The session decides the landing page; a fresh account has no venue yet.
      const session = await new HttpVenueManagementClient(await getAccessToken()).getSession();
      window.location.assign(destinationFor(Boolean(session.venue)));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : errorMessage(caught));
      setPending(false);
    }
  }

  async function submitGoogle() {
    setPending(true);
    setError("");
    try {
      // Redirects away; control only returns here if the handshake failed to start.
      await signInWithGoogle("/venue/dashboard");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Google sign-in could not be started.");
      setPending(false);
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
                  {pending ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
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
              {config.googleEnabled && (
                <button className="vt-secondary" type="button" disabled={pending} onClick={() => void submitGoogle()}>
                  {pending ? "Redirecting…" : "Continue with Google"}
                </button>
              )}
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
                  {pending ? "Signing in…" : "Enter the backend"}
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
      </main>
      <SiteFooter />
    </div>
  );
}
