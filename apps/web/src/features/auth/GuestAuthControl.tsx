import { useState } from "react";
import { signInWithGoogle, signOut } from "./auth-session.js";
import { useAuthState } from "./useAuth.js";

/**
 * Optional guest sign-in for the consumer surfaces. Renders nothing unless an
 * identity provider is configured, so anonymous matching stays the default.
 */
export function GuestAuthControl() {
  const auth = useAuthState();
  const [pending, setPending] = useState(false);

  if (auth.status !== "ready" || auth.config.provider !== "supabase") return null;

  async function start() {
    setPending(true);
    try {
      await signInWithGoogle(window.location.pathname + window.location.search);
    } catch {
      setPending(false);
    }
  }

  async function end() {
    setPending(true);
    await signOut().catch(() => undefined);
    window.location.reload();
  }

  if (auth.account) {
    return (
      <div className="house-header-auth">
        <span title={auth.account.email ?? undefined}>{auth.account.displayName}</span>
        <button type="button" className="vt-link-button" disabled={pending} onClick={() => void end()}>
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button type="button" className="vt-link-button house-header-auth" disabled={pending} onClick={() => void start()}>
      {pending ? "Redirecting…" : "Sign in"}
    </button>
  );
}
