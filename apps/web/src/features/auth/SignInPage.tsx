import { useEffect, useState, type FormEvent } from "react";
import type { AuthConfig } from "@vibetail/contracts";
import { SiteFooter, SiteHeader } from "../platform/components/SiteHeader.js";
import { useSeo } from "../platform/useSeo.js";
import {
  getCurrentUser,
  loadAuthConfig,
  safeNext,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "./auth-session.js";

/**
 * The guest-facing sign-in. Venue owners use /venue, which lands them in the
 * backend; this one only returns the guest to the page they came from, since
 * signing in is optional everywhere on the public side.
 */
export function SignInPage() {
  useSeo("Sign in — Vibetail", "Sign in to keep your Vibetail nights with you.", true);
  const next = safeNext(new URLSearchParams(window.location.search).get("next") ?? "/");
  const [config, setConfig] = useState<AuthConfig>();
  const [checking, setChecking] = useState(true);
  const [configFailed, setConfigFailed] = useState(false);
  const [pendingAction, setPendingAction] = useState<null | "email" | "google">(null);
  const pending = pendingAction !== null;
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // An existing session has nothing to do here.
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const loaded = await loadAuthConfig();
        if (!active) return;
        setConfig(loaded);
      } catch {
        // Without the config the form cannot know which provider applies;
        // showing it anyway would fail on submit.
        if (active) { setConfigFailed(true); setChecking(false); }
        return;
      }
      const user = await getCurrentUser().catch(() => null);
      if (!active) return;
      if (user) window.location.replace(next);
      else setChecking(false);
    })();
    return () => { active = false; };
  }, [next]);

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
      window.location.assign(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That sign-in did not go through.");
      setPendingAction(null);
    }
  }

  async function submitGoogle() {
    setPendingAction("google");
    setError("");
    setNotice("");
    try {
      // Redirects away; control only returns here if the handshake failed to start.
      await signInWithGoogle(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Google sign-in could not be started.");
      setPendingAction(null);
    }
  }

  if (checking) {
    return <div className="vt-page"><SiteHeader /><main className="vt-narrow"><p className="vt-loading">Checking your session…</p></main></div>;
  }

  return (
    <div className="vt-page">
      <SiteHeader />
      <main className="vt-narrow">
        <header className="vt-page-title">
          <p className="vt-kicker">Your Vibetail</p>
          <h1>{mode === "signup" ? "Start your Vibetail." : "Welcome back."}</h1>
          <p>Matching never needs an account. Signing in just keeps your nights attached to you.</p>
        </header>
        {configFailed ? (
          <section className="vt-management-entry">
            <div className="vt-alert" role="alert">Sign-in options could not be loaded. Check your connection and retry.</div>
            <button className="vt-primary" type="button" onClick={() => window.location.reload()}>Retry</button>
          </section>
        ) : config?.provider === "supabase" ? (
          <section className="vt-management-entry">
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
            {error && <div className="vt-alert" role="alert">{error}</div>}
            <small>One Vibetail account covers both sides: run a bar with the same sign-in at <a href="/venue">Management</a>.</small>
          </section>
        ) : (
          <section className="vt-management-entry">
            <div className="vt-alert" role="alert">Sign-in is not configured on this deployment.</div>
            <a className="vt-primary" href={next}>Keep going as a guest</a>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
