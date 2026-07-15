// Deterministic, local matcher. No AI in this function.
// Filters ineligible drinks first, then scores by tag overlap + numeric closeness.

import type { MenuDrink } from "./event-menus";

export type MatchProfile = {
  moodTags: string[];
  flavorTags: string[];

  sweetness?: number;
  acidity?: number;
  bitterness?: number;
  body?: number;
  strength?: number;

  baseSpiritPreference?: string;
  alcoholPreference?: "alcoholic" | "non_alcoholic" | "either";

  excludedIngredients?: string[];
  excludedAllergens?: string[];
};

const lc = (s: string) => s.toLowerCase().trim();
const overlap = (a: string[] = [], b: string[] = []) => {
  const B = new Set(b.map(lc));
  return a.reduce((n, x) => n + (B.has(lc(x)) ? 1 : 0), 0);
};

/** Score numeric closeness on a 1..5 scale. 0 diff → +1, ≥4 diff → 0. */
function closeness(userVal?: number, drinkVal?: number): number {
  if (userVal == null || drinkVal == null) return 0;
  const diff = Math.abs(userVal - drinkVal);
  return Math.max(0, 1 - diff / 4);
}

export function matchMenuDrink(
  profile: MatchProfile,
  drinks: MenuDrink[],
): { drink: MenuDrink; score: number } | null {
  const excludedIng = (profile.excludedIngredients ?? []).map(lc).filter(Boolean);
  const excludedAll = (profile.excludedAllergens ?? []).map(lc).filter(Boolean);
  const alcoholPref = profile.alcoholPreference ?? "either";

  const eligible = drinks.filter((d) => {
    if (!d.isAvailable) return false;
    if (alcoholPref === "alcoholic" && !d.alcoholic) return false;
    if (alcoholPref === "non_alcoholic" && d.alcoholic) return false;
    if (excludedAll.some((a) => (d.allergens ?? []).map(lc).includes(a))) return false;
    if (
      excludedIng.length &&
      d.ingredients.some((ing) => excludedIng.some((x) => lc(ing).includes(x)))
    )
      return false;
    return true;
  });

  if (eligible.length === 0) return null;

  const scored = eligible.map((d) => {
    let score = 0;
    score += overlap(profile.moodTags, d.moodTags) * 2;
    score += overlap(profile.flavorTags, d.flavorTags) * 2;

    score += closeness(profile.sweetness, d.sweetness);
    score += closeness(profile.acidity, d.acidity);
    score += closeness(profile.bitterness, d.bitterness);
    score += closeness(profile.body, d.body);
    score += closeness(profile.strength, d.strength);

    if (
      profile.baseSpiritPreference &&
      d.baseSpirit &&
      lc(profile.baseSpiritPreference) === lc(d.baseSpirit)
    ) {
      score += 2;
    }

    score += (d.priority ?? 0) * 0.1;
    return { drink: d, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}
