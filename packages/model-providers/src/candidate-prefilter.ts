import type { VenuePreferences } from "@vibetail/contracts";
import type { ModelMenuCandidate } from "./index.js";

/**
 * Cheap local scoring shared by the deterministic provider and the service's
 * candidate cap. Token overlap between the guest's words and the item's tags —
 * deliberately simple: the model does the real ranking, this only decides who
 * gets in front of the model at all.
 */
export function candidateSignals(preferences: VenuePreferences): ReadonlySet<string> {
  const tokens = [preferences.mood, preferences.occasion, preferences.freeText, ...preferences.flavors]
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.toLowerCase().split(/[^\p{L}\p{N}_-]+/u))
    .filter(Boolean);
  return new Set(tokens);
}

export function scoreCandidate(
  candidate: ModelMenuCandidate,
  signals: ReadonlySet<string>,
  alcoholPreference: VenuePreferences["alcoholPreference"],
): number {
  let total = 0;
  for (const tag of [...candidate.flavorTags, ...candidate.moodTags]) {
    const normalizedTag = tag.toLowerCase();
    if (signals.has(normalizedTag)) total += 10;
    for (const signal of signals) {
      if (signal.includes(normalizedTag) || normalizedTag.includes(signal)) total += 3;
    }
  }
  if (alcoholPreference === "alcoholic" && candidate.alcoholic) total += 5;
  if (alcoholPreference === "non_alcoholic" && !candidate.alcoholic) total += 5;
  return total;
}

/**
 * Keep the `limit` best-scoring candidates. Order and identity of the input
 * are preserved when it already fits — the cap must be a no-op until it is
 * actually needed. Ties break by recommendationPriority, then id, so a given
 * request always keeps the same items.
 */
export function topCandidates<T extends ModelMenuCandidate>(
  items: readonly T[],
  preferences: VenuePreferences,
  limit: number,
): T[] {
  if (items.length <= limit) return [...items];
  const signals = candidateSignals(preferences);
  const kept = new Set(
    [...items]
      .sort((left, right) =>
        scoreCandidate(right, signals, preferences.alcoholPreference)
          - scoreCandidate(left, signals, preferences.alcoholPreference)
        || right.recommendationPriority - left.recommendationPriority
        || left.id.localeCompare(right.id))
      .slice(0, limit)
      .map((item) => item.id),
  );
  return items.filter((item) => kept.has(item.id));
}
