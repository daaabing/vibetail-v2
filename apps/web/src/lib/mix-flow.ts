// ── Data + payload construction for the five-step mixing flow. ──────────
// Everything the backend sees is assembled here, so the step components stay
// presentational. The API contract is unchanged from the two-stage flow.

import type { Lang } from "./i18n.js";
import type { VenueMenuItem } from "@vibetail/contracts";
import {
  type SensoryState,
  sensorySummary,
  sensoryToFlavors,
  strengthToDrinkLength,
} from "./vibeflow.js";

/* ── Steps ─────────────────────────────────────────────────────────── */

export const STEP_IDS = ["vibe", "taste", "strength", "spirit", "notes"] as const;
export type StepId = (typeof STEP_IDS)[number];
export const STEP_COUNT = STEP_IDS.length;

export const STEP_TITLES: Record<StepId, { en: string }> = {
  vibe: { en: "The vibe" },
  taste: { en: "The texture" },
  strength: { en: "The strength" },
  spirit: { en: "The base" },
  notes: { en: "The notes" },
};

// One accent for every step: gold. The flow runs after dark.
export const STEP_ACCENTS: Record<StepId, string> = {
  vibe: "var(--gold)",
  taste: "var(--gold)",
  strength: "var(--gold)",
  spirit: "var(--gold)",
  notes: "var(--gold)",
};

/* ── Base spirits ──────────────────────────────────────────────────── */

export interface BaseSpirit {
  key: string;
  en: string;
  color: string;
  noteEn: string;
}

export const BASE_SPIRITS: BaseSpirit[] = [
  {
    key: "gin",
    en: "Gin",
    color: "#6f9e4f",
    noteEn: "Botanical, bright",
  },
  {
    key: "vodka",
    en: "Vodka",
    color: "#9fc2d8",
    noteEn: "Clean, gets out of the way",
  },
  {
    key: "rum",
    en: "Rum",
    color: "#b5713a",
    noteEn: "Warm, sugarcane sweetness",
  },
  {
    key: "tequila",
    en: "Tequila",
    color: "#d8c34a",
    noteEn: "Green, peppery agave",
  },
  {
    key: "whiskey",
    en: "Whiskey",
    color: "#8a4623",
    noteEn: "Oak, caramel, weight",
  },
  {
    key: "mezcal",
    en: "Mezcal",
    color: "#6e6a55",
    noteEn: "Smoke, earth, drama",
  },
  {
    key: "brandy",
    en: "Brandy",
    color: "#93394f",
    noteEn: "Dried fruit, velvet",
  },
  {
    key: "sake",
    en: "Sake",
    color: "#e3dcc4",
    noteEn: "Rice, quiet, delicate",
  },
  {
    key: "tashi",
    en: "Tashi",
    color: "#c9962e",
    noteEn: "Highland barley, house recipes",
  },
  {
    key: "nonalcoholic",
    en: "No alcohol",
    color: "#d485ad",
    noteEn: "All ritual, zero proof",
  },
];

// Free-text aliases (EN + ZH) that map a menu item's `base_spirit` string onto
// one of the BASE_SPIRITS keys. Matched as case-insensitive substrings.
const SPIRIT_ALIASES: Record<string, string[]> = {
  gin: ["gin", "金酒", "琴酒"],
  vodka: ["vodka", "伏特加"],
  rum: ["rum", "朗姆"],
  tequila: ["tequila", "龙舌兰"],
  whiskey: ["whiskey", "whisky", "威士忌", "bourbon", "波本", "scotch"],
  mezcal: ["mezcal", "mescal", "梅斯卡尔", "梅斯卡"],
  brandy: ["brandy", "cognac", "白兰地", "干邑"],
  sake: ["sake", "清酒", "日本酒"],
  tashi: ["tashi", "青稞"],
  nonalcoholic: [
    "nonalcoholic",
    "non-alcoholic",
    "non alcoholic",
    "no alcohol",
    "mocktail",
    "zero-proof",
    "zero proof",
    "无酒精",
    "无酒精饮品",
  ],
};

/**
 * Derive the set of BASE_SPIRITS keys that actually appear on a restaurant's
 * menu. An item counts toward a spirit if its free-text base_spirit matches an
 * alias; any non-alcoholic item also enables the "无酒精" option. Only active
 * items are considered. Returns keys ordered to match BASE_SPIRITS.
 */
export function deriveMenuBaseSpiritKeys(
  items: Pick<VenueMenuItem, "baseSpirit" | "alcoholic" | "availabilityStatus">[],
): string[] {
  const found = new Set<string>();
  for (const item of items) {
    if (item.availabilityStatus !== "active") continue;
    if (!item.alcoholic) found.add("nonalcoholic");
    const raw = (item.baseSpirit ?? "").toLowerCase().trim();
    if (!raw) continue;
    for (const [key, aliases] of Object.entries(SPIRIT_ALIASES)) {
      if (aliases.some((a) => raw.includes(a))) found.add(key);
    }
  }
  return BASE_SPIRITS.filter((s) => found.has(s.key)).map((s) => s.key);
}

/* ── Alcohol level ─────────────────────────────────────────────────── */

export type AlcoholLevel = "low" | "standard" | "strong" | "zero";

export const ALCOHOL_LEVELS: {
  value: AlcoholLevel;
  en: string;
  descEn: string;
}[] = [
  {
    value: "low",
    en: "Low / light buzz",
    descEn: "Easy, not too heady",
  },
  {
    value: "standard",
    en: "Standard",
    descEn: "A normal, balanced pour",
  },
  {
    value: "strong",
    en: "Strong",
    descEn: "Spirit-forward, more punch",
  },
  {
    value: "zero",
    en: "Zero-proof",
    descEn: "Vibe only, no alcohol",
  },
];

const ALCOHOL_NOTE: Record<AlcoholLevel, string> = {
  low: "Alcohol level: low / light buzz. ",
  standard: "Alcohol level: standard. ",
  strong: "Alcohol level: strong / spirit-forward. ",
  zero: "Alcohol level: zero-proof mocktail. ",
};

/* ── The order the user is assembling ──────────────────────────────── */

export interface MixOrder {
  moodText: string;
  pickedLabel: string | null;
  sensory: SensoryState;
  alcohol: AlcoholLevel;
  baseSpirit: string;
  manualFlavors: string[];
  referenceDrink: string;
}

/**
 * Fold the order into the two strings the API expects: the flavour list and
 * the free-text `customPreference` note handed to the model.
 */
export function buildPreference(order: MixOrder, lang: Lang) {
  const flavorsFromSensory = sensoryToFlavors(order.sensory);
  const finalFlavors = order.manualFlavors.length ? order.manualFlavors : flavorsFromSensory;
  const drinkLength = strengthToDrinkLength(order.sensory);

  const spirit = BASE_SPIRITS.find((s) => s.key === order.baseSpirit);
  const spiritNote = spirit ? `Base spirit: ${spirit.en}. ` : "";

  const lengthNote =
    drinkLength === "long"
      ? "Format: Long drink (tall glass, plenty of ice and mixer, sippable). "
      : drinkLength === "short"
        ? "Format: Short drink (small glass, spirit-forward, minimal mixer, concentrated). "
        : "";

  const customPreference = (
    spiritNote +
    lengthNote +
    ALCOHOL_NOTE[order.alcohol] +
    sensorySummary(lang, order.sensory) +
    " " +
    (order.referenceDrink || "")
  ).trim();

  return { finalFlavors, drinkLength, customPreference };
}

/** Short human-readable value shown per row in the order panel. */
export function orderSummary(order: MixOrder, lang: Lang, stepId: StepId): string | null {
  switch (stepId) {
    case "vibe":
      return order.moodText.trim() || null;
    case "taste": {
      const touched =
        order.sensory.fresh !== 50 || order.sensory.soft !== 50 || order.sensory.familiar !== 50;
      return touched ? sensorySummary(lang, order.sensory).replace(/^Feel: /, "") : null;
    }
    case "strength": {
      const lvl = ALCOHOL_LEVELS.find((a) => a.value === order.alcohol);
      const length = strengthToDrinkLength(order.sensory);
      const lengthLabel =
        length === "long" ? "long drink" : length === "short" ? "short drink" : "";
      if (order.alcohol === "standard" && !lengthLabel) return null;
      return [lvl?.en, lengthLabel].filter(Boolean).join(" · ");
    }
    case "spirit": {
      const s = BASE_SPIRITS.find((x) => x.key === order.baseSpirit);
      return s?.en ?? null;
    }
    case "notes": {
      const bits: string[] = [];
      if (order.manualFlavors.length) bits.push(order.manualFlavors.join(", "));
      if (order.referenceDrink.trim()) bits.push(`“${order.referenceDrink.trim()}”`);
      return bits.length ? bits.join(" · ") : null;
    }
  }
}
