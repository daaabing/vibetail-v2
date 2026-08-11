import { describe, expect, it } from "vitest";
import { OpenAIModelProvider, type OpenAIResponsesClient, type RestaurantModelRequest } from "./index.js";

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
    traceId: "trace-openai-test",
    timeoutMs: 8_000,
  };
}

describe("OpenAIModelProvider", () => {
  it("uses structured Responses output and preserves the provider boundary", async () => {
    let capturedRequest: Record<string, unknown> | undefined;
    let capturedTimeout: number | undefined;
    const client: OpenAIResponsesClient = {
      responses: {
        parse: async (body, options) => {
          capturedRequest = body;
          capturedTimeout = options?.timeout;
          return {
            output_parsed: {
              matchedItemId: selectedId,
              whyThisMatch: "Neon Garden turns your bright mood into a crisp lemon-and-basil lift with just enough playful edge for a celebratory night.",
            },
          };
        },
      },
    };

    const result = await new OpenAIModelProvider({ apiKey: "test-key", model: "gpt-5.6-terra", client })
      .selectRestaurantItem(request());

    expect(result.selection.matchedItemId).toBe(selectedId);
    expect(result.metadata).toMatchObject({ provider: "openai", model: "gpt-5.6-terra", attempt: 1 });
    expect(capturedRequest).toMatchObject({
      model: "gpt-5.6-terra",
      store: false,
      reasoning: { effort: "low" },
      text: { verbosity: "low" },
    });
    expect(JSON.stringify(capturedRequest)).toContain(selectedId);
    expect(capturedTimeout).toBe(8_000);
  });

  it("rejects malformed model output before the domain service sees it", async () => {
    const client: OpenAIResponsesClient = {
      responses: {
        parse: async () => ({
          output_parsed: { matchedItemId: "not-an-id", whyThisMatch: "Looks good." },
        }),
      },
    };

    await expect(new OpenAIModelProvider({ apiKey: "test-key", model: "gpt-5.6-terra", client })
      .selectRestaurantItem(request())).rejects.toThrow();
  });
});
