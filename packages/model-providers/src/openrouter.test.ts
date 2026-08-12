import { describe, expect, it } from "vitest";
import {
  OpenRouterModelProvider,
  type OpenRouterChatClient,
  type RestaurantModelRequest,
} from "./index.js";

const selectedId = "33333333-3333-4333-8333-333333333331";

function request(): RestaurantModelRequest {
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
      freeText: undefined,
      locale: "en",
    },
    allowedItems: [{
      id: selectedId,
      name: "Neon Garden",
      description: "A crisp citrus and basil highball.",
      ingredients: ["gin", "lemon", "basil"],
      flavorTags: ["bright", "herbal"],
      moodTags: ["playful"],
      alcoholic: true,
    }],
    locale: "en",
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
                    whyThisMatch: "Neon Garden turns bright citrus and basil into a crisp, playful lift for your celebratory mood.",
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
    }).selectRestaurantItem(request());

    expect(result.selection.matchedItemId).toBe(selectedId);
    expect(result.metadata).toMatchObject({
      provider: "openrouter",
      model: "openai/gpt-5-mini",
      attempt: 1,
    });
    expect(capturedRequest).toMatchObject({
      model: "openai/gpt-5-mini",
      max_completion_tokens: 800,
      reasoning: { effort: "minimal", exclude: true },
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
    }).selectRestaurantItem(request())).rejects.toThrow(/no parsed match/);
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
    }).selectRestaurantItem(request())).rejects.toThrow();
  });
});
