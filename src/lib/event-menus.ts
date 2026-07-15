// Event menu registry. Client-safe: no secrets.
// Add new event menus here. Sunday's activation uses `world-cup-final`.

export type EventMenu = {
  id: string;
  slug: string;
  name: string;
  status: "published" | "paused";
  drinks: MenuDrink[];
};

export type MenuDrink = {
  id: string;
  name: string;
  description?: string;
  ingredients: string[];
  imageUrl?: string;

  alcoholic: boolean;
  baseSpirit?: string;

  flavorTags: string[];
  moodTags: string[];

  sweetness?: number;
  acidity?: number;
  bitterness?: number;
  body?: number;
  strength?: number;

  allergens?: string[];
  isAvailable: boolean;
  priority?: number;
};

// ── Sunday: World Cup Final watch party ──
// Manually curated by the Vibetail team.
const WORLD_CUP_FINAL: EventMenu = {
  id: "wcf-2026",
  slug: "world-cup-final",
  name: "World Cup Final Watch Party",
  status: "published",
  drinks: [
    {
      id: "wcf-01",
      name: "Golden Boot",
      description: "Crisp lager cocktail with citrus — fuel for the full 90 minutes.",
      ingredients: ["Blanco tequila", "grapefruit soda", "lime", "salt rim"],
      alcoholic: true,
      baseSpirit: "tequila",
      flavorTags: ["citrus", "fizzy", "refreshing", "salty"],
      moodTags: ["hyped", "social", "energetic", "celebratory"],
      sweetness: 2, acidity: 4, bitterness: 2, body: 2, strength: 3,
      allergens: [],
      isAvailable: true,
      priority: 5,
    },
    {
      id: "wcf-02",
      name: "Extra Time Old Fashioned",
      description: "Slow-sipping bourbon classic for the tense final minutes.",
      ingredients: ["Bourbon", "brown sugar", "orange bitters", "smoked orange peel"],
      alcoholic: true,
      baseSpirit: "whiskey",
      flavorTags: ["smoky", "sweet", "bitter", "warm", "oaky"],
      moodTags: ["focused", "tense", "contemplative", "nostalgic"],
      sweetness: 3, acidity: 1, bitterness: 3, body: 4, strength: 5,
      allergens: [],
      isAvailable: true,
      priority: 4,
    },
    {
      id: "wcf-03",
      name: "Own Goal Spritz",
      description: "Bittersweet Aperol spritz for when things go sideways.",
      ingredients: ["Aperol", "prosecco", "soda", "orange"],
      alcoholic: true,
      baseSpirit: "aperol",
      flavorTags: ["bitter", "citrus", "fizzy", "light"],
      moodTags: ["chill", "social", "bittersweet", "casual"],
      sweetness: 3, acidity: 3, bitterness: 4, body: 2, strength: 2,
      allergens: ["sulfites"],
      isAvailable: true,
      priority: 4,
    },
    {
      id: "wcf-04",
      name: "Penalty Shot",
      description: "Bold mezcal shot — for the moment of truth.",
      ingredients: ["Mezcal", "lime", "sal de gusano"],
      alcoholic: true,
      baseSpirit: "mezcal",
      flavorTags: ["smoky", "earthy", "citrus", "intense"],
      moodTags: ["bold", "hyped", "reckless", "hyped"],
      sweetness: 1, acidity: 3, bitterness: 2, body: 3, strength: 5,
      allergens: [],
      isAvailable: true,
      priority: 3,
    },
    {
      id: "wcf-05",
      name: "Midfield Martini",
      description: "Clean, focused gin martini — controls the tempo.",
      ingredients: ["Gin", "dry vermouth", "olive"],
      alcoholic: true,
      baseSpirit: "gin",
      flavorTags: ["herbal", "dry", "crisp", "savory"],
      moodTags: ["focused", "sharp", "composed", "contemplative"],
      sweetness: 1, acidity: 2, bitterness: 3, body: 3, strength: 5,
      allergens: [],
      isAvailable: true,
      priority: 3,
    },
    {
      id: "wcf-06",
      name: "Stoppage Time Highball",
      description: "Japanese whisky highball — long, cold, endless refills.",
      ingredients: ["Japanese whisky", "soda water", "lemon twist"],
      alcoholic: true,
      baseSpirit: "whiskey",
      flavorTags: ["crisp", "light", "citrus", "clean"],
      moodTags: ["chill", "steady", "social", "long-haul"],
      sweetness: 1, acidity: 2, bitterness: 2, body: 2, strength: 3,
      allergens: [],
      isAvailable: true,
      priority: 3,
    },
    {
      id: "wcf-07",
      name: "Bench Warmer",
      description: "Non-alcoholic ginger cooler for the designated driver.",
      ingredients: ["Ginger beer", "lime", "mint", "cucumber"],
      alcoholic: false,
      flavorTags: ["spicy", "citrus", "fresh", "fizzy"],
      moodTags: ["chill", "social", "clear-headed", "refreshed"],
      sweetness: 3, acidity: 3, bitterness: 1, body: 2, strength: 0,
      allergens: [],
      isAvailable: true,
      priority: 2,
    },
    {
      id: "wcf-08",
      name: "Full-Time Whistle",
      description: "Rich coffee cocktail for the celebration (or the wake).",
      ingredients: ["Vodka", "espresso", "coffee liqueur", "vanilla"],
      alcoholic: true,
      baseSpirit: "vodka",
      flavorTags: ["bitter", "sweet", "roasted", "rich"],
      moodTags: ["celebratory", "late-night", "wired", "bittersweet"],
      sweetness: 4, acidity: 2, bitterness: 4, body: 4, strength: 4,
      allergens: ["dairy"],
      isAvailable: true,
      priority: 3,
    },
  ],
};

const REGISTRY: Record<string, EventMenu> = {
  [WORLD_CUP_FINAL.slug]: WORLD_CUP_FINAL,
};

export function getEventMenu(slug: string): EventMenu | null {
  return REGISTRY[slug] ?? null;
}

export function menuHasAlcohol(menu: EventMenu): boolean {
  return menu.drinks.some((d) => d.alcoholic);
}
