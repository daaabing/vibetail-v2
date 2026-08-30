// A "save this match" intent that survives the OAuth redirect. Stored in
// sessionStorage: it should not outlive the tab, and it must never go in the
// URL where it would leak into referrer headers and server logs.

const KEY = "vibetail.vibe-bar-intent";

export function rememberVibeBarIntent(matchId: string): void {
  try { sessionStorage.setItem(KEY, matchId); } catch { /* storage may be unavailable */ }
}

export function takeVibeBarIntent(): string | null {
  try {
    const matchId = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return matchId && /^[0-9a-f-]{36}$/i.test(matchId) ? matchId : null;
  } catch {
    return null;
  }
}
