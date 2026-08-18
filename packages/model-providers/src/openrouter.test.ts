import { describe, expect, it } from "vitest";
import {
  OpenRouterModelProvider,
  type OpenRouterChatClient,
  type VenueModelRequest,
} from "./index.js";

const selectedId = "33333333-3333-4333-8333-333333333331";

function request(): VenueModelRequest {
  return {
    merchantId: "11111111-1111-4111-8111-111111111111",
    menuId: "22222222-2222-4222-8222-222222222222",
    preferences: {
      mood: "celebratory and curious",
      flavors: ["bright"],
      occasion: undefined,
      alcoholPreference: "either",
      excludedAllergens: [],
      excludedIngredients: [],
      excludeItemIds: [],
      freeText: undefined,
    },
    allowedItems: [{
      id: selectedId,
      name: "Neon Garden",
      description: "A crisp citrus and basil highball.",
      ingredients: ["gin", "lemon", "basil"],
      flavorTags: ["bright", "herbal"],
      moodTags: ["playful"],
      alcoholic: true,
      baseSpirit: "gin",
      section: "Highballs",
      allergens: [],
      recommendationPriority: 0,
    }],
    traceId: "trace-openrouter-test",
    timeoutMs: 8_000,
  };
}

describe("OpenRouterModelProvider", () => {
  it("requests strict structured output through privacy-aware provider routing", async () => {
    let capturedRequest: Record<string, unknown> | undefined;
    let capturedTimeout: number | undefined;
    const client: OpenRouterChatClient = {
      chat: {
        completions: {
          parse: async (body, options) => {
            capturedRequest = body;
            capturedTimeout = options?.timeout;
            return {
              choices: [{
                message: {
                  parsed: {
                    matchedItemId: selectedId,
                    vibeName: "Paper Lantern Hour",
                    tastesLike: "Lemon and basil over a long, cold pour.",
                    flavorProfile: "bright, herbal, crisp",
                    whyThisMatch: "Neon Garden turns bright citrus and basil into a crisp, playful lift for your celebratory mood.",
                    roast: "Celebrating on a Tuesday, are we.",
                  },
                },
              }],
            };
          },
        },
      },
    };

    const result = await new OpenRouterModelProvider({
      apiKey: "test-key",
      model: "openai/gpt-5-mini",
      client,
    }).selectVenueItem(request());

    expect(result.selection.matchedItemId).toBe(selectedId);
    expect(result.metadata).toMatchObject({
      provider: "openrouter",
      model: "openai/gpt-5-mini",
      attempt: 1,
    });
    expect(capturedRequest).toMatchObject({
      model: "openai/gpt-5-mini",
      max_completion_tokens: 1_200,
      reasoning: { effort: "low", exclude: true },
      provider: { require_parameters: true, data_collection: "deny" },
      response_format: { type: "json_schema" },
    });
    expect(JSON.stringify(capturedRequest)).toContain(selectedId);
    expect(capturedTimeout).toBe(8_000);
  });

  it("fails closed when OpenRouter returns no parsed selection", async () => {
    const client: OpenRouterChatClient = {
      chat: { completions: { parse: async () => ({ choices: [{ message: {} }] }) } },
    };

    await expect(new OpenRouterModelProvider({
      apiKey: "test-key",
      model: "openai/gpt-5-mini",
      client,
    }).selectVenueItem(request())).rejects.toThrow(/no parsed match/);
  });

  it("rejects malformed structured output before it reaches the domain service", async () => {
    const client: OpenRouterChatClient = {
      chat: {
        completions: {
          parse: async () => ({
            choices: [{ message: { parsed: { matchedItemId: "not-an-id", whyThisMatch: "Looks good." } } }],
          }),
        },
      },
    };

    await expect(new OpenRouterModelProvider({
      apiKey: "test-key",
      model: "openai/gpt-5-mini",
      client,
    }).selectVenueItem(request())).rejects.toThrow();
  });

  it("suggests drink info through the same strict structured-output path", async () => {
    let capturedRequest: Record<string, unknown> | undefined;
    const client: OpenRouterChatClient = {
      chat: {
        completions: {
          parse: async (body) => {
            capturedRequest = body;
            return {
              choices: [{
                message: {
                  parsed: {
                    flavorTags: ["smoky", "rich"],
                    baseSpirit: "whiskey",
                    strength: "strong",
                    recommendationNote: "A slow, spirit-forward pour for guests settling in for the night.",
                  },
                },
              }],
            };
          },
        },
      },
    };

    const result = await new OpenRouterModelProvider({
      apiKey: "test-key",
      model: "openai/gpt-5-mini",
      client,
    }).suggestDrinkInfo({
      name: "Smoked Pear Old Fashioned",
      description: "Slow-smoked pear syrup folded into rye.",
      ingredients: ["rye whiskey", "pear syrup"],
      traceId: "trace-drink-info-test",
      timeoutMs: 8_000,
    });

    expect(result.suggestion.baseSpirit).toBe("whiskey");
    expect(result.suggestion.strength).toBe("strong");
    expect(capturedRequest).toMatchObject({
      response_format: { type: "json_schema" },
      provider: { require_parameters: true, data_collection: "deny" },
    });
    expect(JSON.stringify(capturedRequest)).toContain("Smoked Pear Old Fashioned");
  });

  it("fails drink info closed on malformed output", async () => {
    const client: OpenRouterChatClient = {
      chat: {
        completions: {
          parse: async () => ({
            choices: [{ message: { parsed: { flavorTags: [], baseSpirit: "", strength: "extreme" } } }],
          }),
        },
      },
    };

    await expect(new OpenRouterModelProvider({
      apiKey: "test-key",
      model: "openai/gpt-5-mini",
      client,
    }).suggestDrinkInfo({
      name: "Mystery",
      description: null,
      ingredients: [],
      traceId: "trace-drink-info-bad",
      timeoutMs: 8_000,
    })).rejects.toThrow();
  });
});
