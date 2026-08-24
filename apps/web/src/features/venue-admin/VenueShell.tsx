import { useEffect, useState, type ReactNode } from "react";
import type { VenueSessionInfo } from "@vibetail/contracts";
import { HttpVenueManagementClient } from "../../clients/http-venue-management-client.js";
import { VenueClientError } from "../../clients/http-venue-client.js";
import { getAccessToken, signOut } from "../auth/auth-session.js";
import { SiteFooter, SiteHeader } from "../platform/components/SiteHeader.js";
import { clearVenueToken, readCachedVenueSession, saveCachedVenueSession } from "./session-store.js";

export type VenueAdminSection = "dashboard" | "drinks" | "menus" | "qr" | "profile";

export interface VenueSessionState {
  client: HttpVenueManagementClient;
  session: VenueSessionInfo;
  refreshSession(): Promise<void>;
}

interface SessionState {
  client: HttpVenueManagementClient;
  session: VenueSessionInfo;
}

/**
 * Rebuilds usable state from the cached snapshot synchronously, so a page
 * navigation renders without waiting on the network. The client resolves its
 * token per request, so it needs no upfront await either.
 */
function stateFromCache(): SessionState | undefined {
  const cached = readCachedVenueSession();
  return cached ? { client: new HttpVenueManagementClient(getAccessToken), session: cached } : undefined;
}

/**
 * Verifies the stored session and redirects to /venue (no session) or
 * /venue/setup (no venue yet) before rendering an admin page. A cached
 * session renders immediately while that check runs in the background.
 */
export function useVenueSession(): VenueSessionState | null {
  const [state, setState] = useState<SessionState | undefined>(stateFromCache);

  useEffect(() => {
    let active = true;
    void (async () => {
      const token = await getAccessToken().catch(() => null);
      if (!active) return;
      if (!token) {
        clearVenueToken();
        window.location.replace("/venue");
        return;
      }
      try {
        const session = await new HttpVenueManagementClient(getAccessToken).getSession();
        if (!active) return;
        saveCachedVenueSession(session);
        if (!session.venue && window.location.pathname !== "/venue/setup") {
          window.location.replace("/venue/setup");
          return;
        }
        // Keep the cached-path client if one is already rendering: a new
        // instance would re-fire every page effect keyed on it.
        setState((current) => ({ client: current?.client ?? new HttpVenueManagementClient(getAccessToken), session }));
      } catch (error: unknown) {
        if (!active) return;
        if (error instanceof VenueClientError && error.status === 401) {
          clearVenueToken();
          window.location.replace("/venue");
          return;
        }
        // Transient failure (network blip, 5xx): keep serving the cached
        // session rather than signing the merchant out. Without a cache there
        // is nothing to render, so only then fall back to the login page.
        if (!readCachedVenueSession()) window.location.replace("/venue");
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!state) return null;
  const { client } = state;
  return {
    client,
    session: state.session,
    refreshSession: async () => {
      const session = await client.getSession();
      saveCachedVenueSession(session);
      setState({ client, session });
    },
  };
}

const NAV_ITEMS: Array<{ section: VenueAdminSection; href: string; label: string }> = [
  { section: "dashboard", href: "/venue/dashboard", label: "Dashboard" },
  { section: "drinks", href: "/venue/drinks", label: "Drink library" },
  { section: "menus", href: "/venue/menus", label: "Menus" },
  { section: "qr", href: "/venue/qr", label: "QR code" },
  { section: "profile", href: "/venue/profile", label: "Profile" },
];

export function VenueShell({ active, state, children }: {
  active: VenueAdminSection;
  state: VenueSessionState;
  children: ReactNode;
}) {
  async function logout() {
    try {
      await state.client.logout();
    } catch {
      // The local session is cleared regardless; a failed revoke only matters server-side.
    }
    await signOut().catch(() => undefined);
    window.location.assign("/venue");
  }

  const venue = state.session.venue;
  return (
    <div className="vt-page vt-management">
      <SiteHeader />
      <main className="vt-wide">
        <header className="vt-management-title">
          <div>
            <p className="vt-kicker">Venue backend</p>
            <h1>{venue?.name ?? state.session.account.displayName}</h1>
            {venue?.address && <p>{venue.address}</p>}
          </div>
          <div className="vt-inline-actions">
            {venue && <a className="vt-secondary" href={`/m/${venue.slug}`}>Guest view</a>}
            <button className="vt-link-button" onClick={() => void logout()}>Sign out</button>
          </div>
        </header>
        <nav className="vt-venue-nav" aria-label="Venue backend">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.section}
              href={item.href}
              aria-current={item.section === active ? "page" : undefined}
            >
              {item.label}
            </a>
          ))}
        </nav>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function VenueAdminLoading() {
  return (
    <div className="vt-page">
      <SiteHeader />
      <main className="vt-narrow"><p className="vt-loading">Checking your venue session…</p></main>
    </div>
  );
}

export function errorMessage(error: unknown): string {
  return error instanceof VenueClientError
    ? error.detail.message
    : "The venue backend could not complete that action.";
}
