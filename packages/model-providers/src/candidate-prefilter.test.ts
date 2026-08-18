import { describe, expect, it } from "vitest";
import { topCandidates } from "./candidate-prefilter.js";
import type { ModelMenuCandidate } from "./index.js";

function candidate(id: string, overrides: Partial<ModelMenuCandidate> = {}): ModelMenuCandidate {
  return {
    id,
    name: `Item ${id}`,
    description: null,
    ingredients: [],
    flavorTags: [],
    moodTags: [],
    alcoholic: true,
    baseSpirit: null,
    section: null,
    allergens: [],
    recommendationPriority: 0,
    ...overrides,
  };
}

const preferences = {
  mood: "smoky celebration",
  flavors: ["bright"],
  alcoholPreference: "either" as const,
  excludedAllergens: [],
  excludedIngredients: [],
  excludeItemIds: [],
};

describe("topCandidates", () => {
  it("is a no-op below the limit, preserving order and identity", () => {
    const items = [candidate("b"), candidate("a"), candidate("c")];
    expect(topCandidates(items, preferences, 3)).toEqual(items);
  });

  it("keeps the best tag matches when the pool exceeds the limit", () => {
    const items = [
      candidate("filler-1"),
      candidate("smoky", { flavorTags: ["smoky"] }),
      candidate("filler-2"),
      candidate("bright", { flavorTags: ["bright"] }),
      candidate("filler-3"),
    ];
    const kept = topCandidates(items, preferences, 2).map((item) => item.id);
    expect(kept).toEqual(["smoky", "bright"]);
  });

  it("keeps input order among the survivors, not score order", () => {
    const items = [
      candidate("bright", { flavorTags: ["bright"] }),
      candidate("filler"),
      candidate("smoky", { flavorTags: ["smoky", "bright"] }),
    ];
    // "smoky" scores higher, but the surviving pair stays in input order — the
    // prompt shuffles later anyway, and stable output keeps traces comparable.
    expect(topCandidates(items, preferences, 2).map((item) => item.id)).toEqual(["bright", "smoky"]);
  });

  it("breaks score ties by recommendationPriority, then id, deterministically", () => {
    const items = [
      candidate("zz", { recommendationPriority: 0 }),
      candidate("aa", { recommendationPriority: 0 }),
      candidate("prioritized", { recommendationPriority: 5 }),
    ];
    const kept = topCandidates(items, preferences, 2).map((item) => item.id);
    expect(kept).toEqual(["aa", "prioritized"]);
    expect(topCandidates(items, preferences, 2).map((item) => item.id)).toEqual(kept);
  });

  it("honors the alcohol preference as a scoring signal", () => {
    const items = [
      candidate("boozy", { alcoholic: true }),
      candidate("zero", { alcoholic: false }),
      candidate("boozy-2", { alcoholic: true }),
    ];
    const kept = topCandidates(items, { ...preferences, alcoholPreference: "non_alcoholic" }, 1);
    expect(kept.map((item) => item.id)).toEqual(["zero"]);
  });
});
