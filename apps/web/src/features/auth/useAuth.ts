import { useEffect, useState } from "react";
import type { AuthConfig } from "@vibetail/contracts";
import { getSignedInAccount, loadAuthConfig, type AuthAccount } from "./auth-session.js";

export type AuthState =
  | { status: "loading" }
  | { status: "unavailable" }
  | { status: "ready"; config: AuthConfig; account: AuthAccount | null };

/**
 * Read-only view of the current sign-in, for surfaces where signing in is
 * optional. `unavailable` means the config could not be read; callers should
 * keep working anonymously rather than block the page.
 */
export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    Promise.all([loadAuthConfig(), getSignedInAccount()])
      .then(([config, account]) => {
        if (active) setState({ status: "ready", config, account });
      })
      .catch(() => {
        if (active) setState({ status: "unavailable" });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}
