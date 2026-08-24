import { venueSessionInfoSchema, type VenueSessionInfo } from "@vibetail/contracts";

const STORAGE_KEY = "vibetail:venue-session:v1";
const SESSION_CACHE_KEY = "vibetail:venue-session-cache:v1";

export function readVenueToken(): string | null {
  try {
    const token = window.localStorage.getItem(STORAGE_KEY);
    return token && token.length >= 16 ? token : null;
  } catch {
    return null;
  }
}

export function saveVenueToken(token: string): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, token);
  } catch {
    // Private-mode storage failures degrade to a per-page session.
  }
}

export function clearVenueToken(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    // A dead credential invalidates the snapshot with it: keeping the cache
    // would let a signed-out browser keep rendering the previous account.
    window.localStorage.removeItem(SESSION_CACHE_KEY);
  } catch {
    // Ignore storage failures on cleanup.
  }
}

/**
 * Last confirmed session snapshot, so admin pages can render instantly on
 * navigation while the real check runs in the background. Display data only —
 * authorization stays with the token and the server.
 */
export function readCachedVenueSession(): VenueSessionInfo | null {
  try {
    const raw = window.localStorage.getItem(SESSION_CACHE_KEY);
    if (!raw) return null;
    return venueSessionInfoSchema.parse(JSON.parse(raw));
  } catch {
    // Unparseable or stale-shaped snapshots fall back to the slow path.
    return null;
  }
}

export function saveCachedVenueSession(session: VenueSessionInfo): void {
  try {
    window.localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(session));
  } catch {
    // Private-mode storage failures degrade to the slow path.
  }
}
