// Shared matching types. Every game outputs a MatchProfile with this shape;
// the recommendation engine consumes it against any Menu's items.

export type AlcoholPreference = "alcoholic" | "non_alcoholic" | "either";

export interface MatchDimensions {
  sweetness?: number; // 0..1
  acidity?: number; // 0..1
  bitterness?: number; // 0..1
  body?: number; // 0..1
  strength?: number; // 0..1
}

export interface MatchExclusions {
  allergens: string[];
  ingredients: string[];
  baseSpirits: string[];
}

export interface MatchProfile {
  moodTags: string[];
  flavorTags: string[];
  dimensions: MatchDimensions;
  preferredBaseSpirits?: string[];
  alcoholPreference?: AlcoholPreference;
  exclusions: MatchExclusions;
}

export interface GameResultPayload {
  gameId: string;
  gameVersion: string;
  /** Whatever the game shows on the front of the card. */
  displayResult: Record<string, unknown>;
  matchProfile: MatchProfile;
}

/** Public shape of a menu item returned to the client / passed to matching. */
export interface PublicMenuItem {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  imageUrl: string | null;
  alcoholic: boolean;
  baseSpirit: string | null;
  flavorTags: string[];
  moodTags: string[];
  dimensions: MatchDimensions;
  allergens: string[];
  recommendationPriority: number;
  availabilityStatus: "active" | "sold_out";
  section: string | null;
}

export interface PublicMenu {
  merchantId: string;
  merchantSlug: string;
  merchantName: string;
  merchantLogoUrl: string | null;
  merchantCoverUrl: string | null;
  menuId: string;
  menuSlug: string;
  menuName: string;
  menuVersionId: string;
  menuVersionNumber: number;
  shortIntro: string | null;
  coverImageUrl: string | null;
  fullMenuUrl: string | null;
  fullMenuType: "pdf" | "image" | null;
  enabledGameIds: string[];
  gameDisplayOrder: string[];
  hasAlcoholic: boolean;
  items: PublicMenuItem[];
}
