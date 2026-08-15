import { venueMatchResultSchema, venuePreferencesSchema, type VenueMatchResult, type VenuePreferences } from "@vibetail/contracts";

const STORAGE_KEY = "vibetail:match-handoff:v1";
const MAX_AGE_MS = 30 * 60 * 1000;

interface MatchHandoff {
  createdAt: number;
  path: string;
  preferences: VenuePreferences;
  result: VenueMatchResult;
}

export function saveMatchHandoff(path: string, preferences: VenuePreferences, result: VenueMatchResult): void {
  try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ createdAt: Date.now(), path, preferences, result })); }
  catch { /* Navigation still works when storage is unavailable. */ }
}

export function readMatchHandoff(path: string, now = Date.now()): { preferences: VenuePreferences; result: VenueMatchResult } | undefined {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    return parseMatchHandoff(JSON.parse(raw), path, now);
  } catch {
    try { window.sessionStorage.removeItem(STORAGE_KEY); } catch { /* Ignore unavailable storage. */ }
    return undefined;
  }
}

export function clearMatchHandoff(): void {
  try { window.sessionStorage.removeItem(STORAGE_KEY); } catch { /* Ignore unavailable storage. */ }
}

export function parseMatchHandoff(value: unknown, path: string, now: number): { preferences: VenuePreferences; result: VenueMatchResult } | undefined {
  if (!value || typeof value !== "object") return undefined;
  const candidate = value as Partial<MatchHandoff>;
  if (candidate.path !== path || typeof candidate.createdAt !== "number" || now - candidate.createdAt > MAX_AGE_MS || candidate.createdAt > now + 60_000) return undefined;
  const preferences = venuePreferencesSchema.safeParse(candidate.preferences);
  const result = venueMatchResultSchema.safeParse(candidate.result);
  if (!preferences.success || !result.success) return undefined;
  const expectedPath = `/m/${result.data.venue.slug}/${result.data.menu.slug}`;
  return expectedPath === path ? { preferences: preferences.data, result: result.data } : undefined;
}
