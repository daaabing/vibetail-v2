import { drinkInfoSuggestionSchema } from "@vibetail/contracts";
import { describe, expect, it } from "vitest";
import { DeterministicMatchingProvider } from "./deterministic.js";
import type { DrinkInfoModelRequest } from "./index.js";

function request(overrides: Partial<DrinkInfoModelRequest> = {}): DrinkInfoModelRequest {
  return {
    name: "Smoked Pear Old Fashioned",
    description: "Slow-smoked pear syrup folded into rye and bitters.",
    ingredients: ["rye whiskey", "pear syrup", "angostura bitters"],
    traceId: "trace-deterministic-drink-info",
    timeoutMs: 1_000,
    ...overrides,
  };
}

describe("DeterministicMatchingProvider drink info", () => {
  it("detects a spirit-forward whiskey drink and emits contract-valid output", async () => {
    const result = await new DeterministicMatchingProvider().suggestDrinkInfo(request());
    const suggestion = drinkInfoSuggestionSchema.parse(result.suggestion);
    expect(suggestion.baseSpirit).toBe("whiskey");
    expect(suggestion.strength).toBe("strong");
    expect(suggestion.flavorTags).toContain("smoky");
    expect(suggestion.flavorTags).toContain("fruity");
    expect(result.metadata.provider).toBe("deterministic");
  });

  it("classifies drinks without spirits as zero strength", async () => {
    const result = await new DeterministicMatchingProvider().suggestDrinkInfo(request({
      name: "Sunset Cooler",
      description: "Blood orange and passionfruit over soda.",
      ingredients: ["blood orange", "passionfruit", "soda"],
    }));
    expect(result.suggestion.baseSpirit).toBe("none");
    expect(result.suggestion.strength).toBe("zero");
    expect(result.suggestion.flavorTags).toContain("citrusy");
  });

  it("treats lengthened drinks as light and falls back to a balanced tag", async () => {
    const spritz = await new DeterministicMatchingProvider().suggestDrinkInfo(request({
      name: "Garden Spritz",
      description: "Gin lengthened with tonic.",
      ingredients: ["gin", "tonic"],
    }));
    expect(spritz.suggestion.strength).toBe("light");

    const unknown = await new DeterministicMatchingProvider().suggestDrinkInfo(request({
      name: "House Special",
      description: null,
      ingredients: ["vodka"],
    }));
    expect(unknown.suggestion.flavorTags).toEqual(["balanced"]);
    expect(unknown.suggestion.strength).toBe("medium");
  });

});
