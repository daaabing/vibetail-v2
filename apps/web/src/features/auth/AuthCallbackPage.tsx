import { useEffect, useState } from "react";
import { SiteFooter, SiteHeader } from "../platform/components/SiteHeader.js";
import { useSeo } from "../platform/useSeo.js";
import { completeOAuthRedirect } from "./auth-session.js";

/** Lands the Google redirect, exchanges the code, then returns to `next`. */
export function AuthCallbackPage() {
  useSeo("Signing in — Vibetail", "Completing your Vibetail sign-in.", true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    completeOAuthRedirect(window.location.search)
      .then((next) => {
        // replace() keeps the one-time code out of the back-button history.
        window.location.replace(next);
      })
      .catch((caught: unknown) => {
        if (active) setError(caught instanceof Error ? caught.message : "Sign-in could not be completed.");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="vt-page">
      <SiteHeader />
      <main className="vt-narrow">
        {error ? (
          <section className="vt-management-entry">
            <div className="vt-alert" role="alert">{error}</div>
            <a className="vt-primary" href="/venue">Back to sign in</a>
          </section>
        ) : (
          <p className="vt-loading">Completing your sign-in…</p>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
