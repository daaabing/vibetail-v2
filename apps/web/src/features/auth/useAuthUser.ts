import { useEffect, useState } from "react";
import { getCurrentUser, hasStoredSession, type AuthUser } from "./auth-session.js";

export type AuthState =
  | { status: "loading" }
  | { status: "guest" }
  | { status: "signed_in"; user: AuthUser };

/**
 * The current guest, for chrome that renders on every page. When storage holds
 * no session the hook settles on `guest` before the first paint — no flicker,
 * and the auth SDK is never loaded for a signed-out visitor.
 */
export function useAuthUser(): AuthState {
  const [pending] = useState(hasStoredSession);
  const [state, setState] = useState<AuthState>(pending ? { status: "loading" } : { status: "guest" });

  useEffect(() => {
    if (!pending) return;
    let active = true;
    void getCurrentUser()
      .then((user) => {
        if (active) setState(user ? { status: "signed_in", user } : { status: "guest" });
      })
      .catch(() => {
        // A stale or unreadable session is not worth blocking the header on.
        if (active) setState({ status: "guest" });
      });
    return () => {
      active = false;
    };
  }, [pending]);

  return state;
}
