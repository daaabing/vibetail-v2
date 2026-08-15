const STORAGE_KEY = "vibetail:venue-session:v1";

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
  } catch {
    // Ignore storage failures on cleanup.
  }
}
