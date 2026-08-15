import { useEffect, useState, type FormEvent } from "react";
import { HttpVenueManagementClient } from "../../../clients/http-venue-management-client.js";
import { SiteFooter, SiteHeader } from "../../platform/components/SiteHeader.js";
import { useSeo } from "../../platform/useSeo.js";
import { errorMessage } from "../VenueShell.js";
import { clearVenueToken, readVenueToken, saveVenueToken } from "../session-store.js";

function destinationFor(hasVenue: boolean): string {
  return hasVenue ? "/venue/dashboard" : "/venue/setup";
}

export function VenueLoginPage() {
  useSeo("Venue sign in — Vibetail", "Enter the Vibetail venue backend.", true);
  const [checking, setChecking] = useState(() => Boolean(readVenueToken()));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = readVenueToken();
    if (!token) return;
    let active = true;
    new HttpVenueManagementClient(token).getSession()
      .then((session) => {
        if (active) window.location.replace(destinationFor(Boolean(session.venue)));
      })
      .catch(() => {
        clearVenueToken();
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
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
          <p>Enter your account name</p>
          <form className="vt-admin-form" onSubmit={submit}>
            <label>
              Account name
              <input name="name" required minLength={1} maxLength={80} placeholder="e.g. Nightjar Team" autoComplete="username" />
            </label>
            <button className="vt-primary" type="submit" disabled={pending}>
              {pending ? "Signing in…" : "Enter the backend"}
            </button>
          </form>
          {error && <div className="vt-alert" role="alert">{error}</div>}
          <small>
            MVP sign-in is passwordless: anyone who knows the account name can open it.
            A returning name reopens its venue; a new name starts a fresh account.
            Try the fixture demo with “Demo Bar”.
          </small>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
