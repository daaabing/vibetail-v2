import type { RestaurantMatchResult } from "@vibetail/contracts";

export interface LegacyResultViewModel {
  itemName: string;
  description: string | null;
  price: string | null;
  section: string | null;
  baseSpirit: string | null;
  ingredients: string[];
  flavorTags: string[];
  explanation: string;
}

// Temporary compatibility seam: canonical server facts are shaped for the
// isolated legacy-inspired card here, never inside the domain or API layer.
export function toLegacyResultViewModel(result: RestaurantMatchResult): LegacyResultViewModel {
  return {
    itemName: result.item.name,
    description: result.item.description,
    price: result.item.price,
    section: result.item.section,
    baseSpirit: result.item.baseSpirit,
    ingredients: [...result.item.ingredients],
    flavorTags: [...result.item.flavorTags],
    explanation: result.whyThisMatch,
  };
}
