import { useEffect, useState, type FormEvent } from "react";
import type { AuthConfig } from "@vibetail/contracts";
import { HttpVenueManagementClient } from "../../../clients/http-venue-management-client.js";
import { getAccessToken, loadAuthConfig, signInWithGoogle } from "../../auth/auth-session.js";
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
              <p>Sign in with your Google account</p>
              <button className="vt-primary" type="button" disabled={pending} onClick={() => void submitGoogle()}>
                {pending ? "Redirecting…" : "Continue with Google"}
              </button>
              <small>
                Guests and venue owners share one Vibetail account. Signing in here also
                signs you in on the guest side; you become a venue owner once you create a venue.
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
