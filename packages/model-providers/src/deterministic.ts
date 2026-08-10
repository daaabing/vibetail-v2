import type { ModelMenuCandidate, ModelProvider, ModelProviderResult, RestaurantModelRequest } from "./index.js";

export interface DeterministicMatchingProviderOptions {
  failureMenuIds?: readonly string[];
}

export class DeterministicMatchingProvider implements ModelProvider {
  readonly id = "deterministic";
  private readonly failureMenuIds: ReadonlySet<string>;

  constructor(options: DeterministicMatchingProviderOptions = {}) {
    this.failureMenuIds = new Set(options.failureMenuIds ?? []);
  }

  async selectRestaurantItem(request: RestaurantModelRequest): Promise<ModelProviderResult> {
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

    const isZh = request.locale === "zh";
    const signalLabel = request.preferences.flavors[0] ?? request.preferences.mood;
    const whyThisMatch = isZh
      ? `${selected.name} 的风味和你${signalLabel ? `“${signalLabel}”` : "今晚"}的状态最贴近。菜单事实来自餐厅数据。`
      : `${selected.name} best matches ${signalLabel ? `your “${signalLabel}” signal` : "tonight's vibe"}. Menu facts come from the restaurant record.`;

    return {
      selection: { matchedItemId: selected.id, whyThisMatch },
      metadata: {
        provider: this.id,
        model: "rules-v1",
        attempt: 1,
        durationMs: Math.max(0, Math.round(performance.now() - startedAt)),
      },
    };
  }
}

function score(
  candidate: ModelMenuCandidate,
  signals: ReadonlySet<string>,
  request: RestaurantModelRequest,
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
