import type {
  DrinkInfoModelRequest,
  DrinkInfoProvider,
  DrinkInfoResult,
  ModelMenuCandidate,
  ModelProvider,
  ModelProviderResult,
  VenueModelRequest,
} from "./index.js";

export interface DeterministicMatchingProviderOptions {
  failureMenuIds?: readonly string[];
}

export class DeterministicMatchingProvider implements ModelProvider, DrinkInfoProvider {
  readonly id = "deterministic";
  private readonly failureMenuIds: ReadonlySet<string>;

  constructor(options: DeterministicMatchingProviderOptions = {}) {
    this.failureMenuIds = new Set(options.failureMenuIds ?? []);
  }

  async selectVenueItem(request: VenueModelRequest): Promise<ModelProviderResult> {
    const startedAt = performance.now();
    if (this.failureMenuIds.has(request.menuId)) {
      throw new Error("Deterministic fixture provider failure");
    }
    if (request.allowedItems.length === 0) {
      throw new Error("No allowed menu items were provided");
    }

    const signals = normalize([
      request.preferences.mood,
      request.preferences.occasion,
      request.preferences.freeText,
      ...request.preferences.flavors,
    ]);
    const ranked = [...request.allowedItems].sort((left, right) => {
      const scoreDelta = score(right, signals, request) - score(left, signals, request);
      if (scoreDelta !== 0) return scoreDelta;
      return left.id.localeCompare(right.id);
    });
    const selected = ranked[0];
    if (!selected) throw new Error("No deterministic match was available");

    const signalLabel = request.preferences.flavors[0] ?? request.preferences.mood;
    const whyThisMatch = `${selected.name} best matches ${signalLabel ? `your “${signalLabel}” signal` : "tonight's vibe"}. Menu facts come from the venue record.`;
    // Rule-based stand-ins: the fixture provider keeps the shape honest without
    // pretending to have the model's voice.
    const moodLabel = request.preferences.mood ?? signalLabel ?? "tonight";
    const vibeName = `A ${moodLabel} kind of night`;
    const tastesLike = `${selected.ingredients.slice(0, 3).join(", ") || "This pour"} — right where the mood already is.`;
    const flavorProfile = selected.flavorTags.slice(0, 4).join(", ") || "balanced, easy";
    const roast = "Ordering this says more than you meant it to.";

    return {
      selection: { matchedItemId: selected.id, vibeName, tastesLike, flavorProfile, whyThisMatch, roast },
      metadata: {
        provider: this.id,
        model: "rules-v1",
        attempt: 1,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      },
    };
  }

  async suggestDrinkInfo(request: DrinkInfoModelRequest): Promise<DrinkInfoResult> {
    const startedAt = performance.now();
    const corpus = [request.name, request.description ?? "", ...request.ingredients]
      .join(" ")
      .toLowerCase();

    const baseSpirit = detectBaseSpirit(corpus);
    const strength = detectStrength(corpus, baseSpirit);
    const flavorTags = detectFlavorTags(corpus);
    const strengthWord = { zero: "alcohol-free", light: "easygoing", medium: "balanced", strong: "spirit-forward" }[strength];
    const recommendationNote = `Suggest ${request.name} to guests looking for a ${strengthWord}, ${flavorTags[0] ?? "balanced"} pour tonight.`;

    return {
      suggestion: { flavorTags, baseSpirit, strength, recommendationNote },
      metadata: {
        provider: this.id,
        model: "rules-v1",
        attempt: 1,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      },
    };
  }
}

const SPIRIT_KEYWORDS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["gin", ["gin"]],
  ["vodka", ["vodka"]],
  ["rum", ["rum", "cachaca", "cachaça"]],
  ["tequila", ["tequila", "mezcal"]],
  ["whiskey", ["whiskey", "whisky", "bourbon", "rye", "scotch"]],
  ["brandy", ["brandy", "cognac", "pisco"]],
  ["wine", ["wine", "champagne", "prosecco", "sparkling wine", "vermouth", "sherry", "port"]],
  ["sake", ["sake", "soju", "shochu"]],
  ["beer", ["beer", "stout", "lager", "ale"]],
  ["liqueur", ["liqueur", "amaro", "aperol", "campari", "chartreuse", "triple sec", "curacao", "curaçao"]],
];

const FLAVOR_KEYWORDS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["citrusy", ["lemon", "lime", "yuzu", "citrus", "grapefruit", "orange"]],
  ["smoky", ["smoke", "smoked", "mezcal", "peat"]],
  ["bitter", ["coffee", "espresso", "amaro", "campari", "bitter"]],
  ["sweet", ["honey", "syrup", "caramel", "vanilla"]],
  ["fruity", ["berry", "strawberry", "peach", "pear", "apple", "passionfruit", "mango", "pineapple"]],
  ["herbal", ["mint", "basil", "rosemary", "thyme", "sage", "herbal"]],
  ["spicy", ["ginger", "chili", "jalapeno", "jalapeño", "pepper", "spice"]],
  ["creamy", ["cream", "coconut", "egg white", "milk"]],
  ["floral", ["elderflower", "rose", "lavender", "hibiscus", "floral"]],
  ["aromatic", ["bitters", "angostura", "cardamom", "clove", "anise"]],
];

function detectBaseSpirit(corpus: string): string {
  for (const [spirit, keywords] of SPIRIT_KEYWORDS) {
    if (keywords.some((keyword) => corpus.includes(keyword))) return spirit;
  }
  return "none";
}

function detectStrength(corpus: string, baseSpirit: string): "zero" | "light" | "medium" | "strong" {
  if (baseSpirit === "none") return "zero";
  if (baseSpirit === "wine" || baseSpirit === "beer") return "light";
  if (/martini|old fashioned|negroni|manhattan|sazerac|neat|overproof/.test(corpus)) return "strong";
  if (/soda|spritz|highball|tonic|cooler|fizz/.test(corpus)) return "light";
  const spiritHits = SPIRIT_KEYWORDS.filter(([spirit, keywords]) =>
    spirit !== "wine" && spirit !== "beer" && keywords.some((keyword) => corpus.includes(keyword)),
  ).length;
  return spiritHits >= 2 ? "strong" : "medium";
}

function detectFlavorTags(corpus: string): string[] {
  const tags = FLAVOR_KEYWORDS
    .filter(([, keywords]) => keywords.some((keyword) => corpus.includes(keyword)))
    .map(([tag]) => tag)
    .slice(0, 8);
  return tags.length > 0 ? tags : ["balanced"];
}

function score(
  candidate: ModelMenuCandidate,
  signals: ReadonlySet<string>,
  request: VenueModelRequest,
): number {
  let total = 0;
  for (const tag of [...candidate.flavorTags, ...candidate.moodTags]) {
    const normalizedTag = tag.toLowerCase();
    if (signals.has(normalizedTag)) total += 10;
    for (const signal of signals) {
      if (signal.includes(normalizedTag) || normalizedTag.includes(signal)) total += 3;
    }
  }
  const preference = request.preferences.alcoholPreference;
  if (preference === "alcoholic" && candidate.alcoholic) total += 5;
  if (preference === "non_alcoholic" && !candidate.alcoholic) total += 5;
  return total;
}

function normalize(values: readonly (string | undefined)[]): ReadonlySet<string> {
  const tokens = values
    .filter((value): value is string => Boolean(value))
    .flatMap((value) => value.toLowerCase().split(/[^\p{L}\p{N}_-]+/u))
    .filter(Boolean);
  return new Set(tokens);
}
