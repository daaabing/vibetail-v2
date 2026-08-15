import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { VenueSessionInfo } from "@vibetail/contracts";
import { HttpVenueManagementClient } from "../../clients/http-venue-management-client.js";
import { VenueClientError } from "../../clients/http-venue-client.js";
import { SiteFooter, SiteHeader } from "../platform/components/SiteHeader.js";
import { clearVenueToken, readVenueToken } from "./session-store.js";

export type VenueAdminSection = "dashboard" | "drinks" | "menus" | "qr";

export interface VenueSessionState {
  client: HttpVenueManagementClient;
  session: VenueSessionInfo;
  refreshSession(): Promise<void>;
}

/**
 * Verifies the stored session and redirects to /venue (no session) or
 * /venue/setup (no venue yet) before rendering an admin page.
 */
export function useVenueSession(): VenueSessionState | null {
  const token = useMemo(() => readVenueToken(), []);
  const client = useMemo(() => new HttpVenueManagementClient(token), [token]);
  const [session, setSession] = useState<VenueSessionInfo>();

  useEffect(() => {
    if (!token) {
      window.location.replace("/venue");
      return;
    }
    let active = true;
    client.getSession()
      .then((loaded) => {
        if (!active) return;
        if (!loaded.venue && window.location.pathname !== "/venue/setup") {
          window.location.replace("/venue/setup");
          return;
        }
        setSession(loaded);
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof VenueClientError && error.status === 401) clearVenueToken();
        window.location.replace("/venue");
      });
    return () => {
      active = false;
    };
  }, [client, token]);

  if (!session) return null;
  return {
    client,
    session,
    refreshSession: async () => {
      setSession(await client.getSession());
    },
  };
}

const NAV_ITEMS: Array<{ section: VenueAdminSection; href: string; label: string }> = [
  { section: "dashboard", href: "/venue/dashboard", label: "Dashboard" },
  { section: "drinks", href: "/venue/drinks", label: "Drink library" },
  { section: "menus", href: "/venue/menus", label: "Menus" },
  { section: "qr", href: "/venue/qr", label: "QR code" },
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
      // The local token is cleared regardless; a failed revoke only matters server-side.
    }
    clearVenueToken();
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
