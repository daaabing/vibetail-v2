import type { StructuredLogEvent, TelemetrySink } from "@vibetail/observability";
import { describe, expect, it } from "vitest";
import type { VenueModelRequest } from "./index.js";
import {
  VertexGeminiModelProvider,
  VertexGeminiProviderError,
  type VertexGeminiClient,
} from "./vertex-gemini.js";

const selectedId = "33333333-3333-4333-8333-333333333331";

function request(locale: "en" | "zh" = "en"): VenueModelRequest {
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
      locale,
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
    locale,
    traceId: "trace-vertex-test",
    timeoutMs: 8_000,
  };
}

function captureTelemetry(events: StructuredLogEvent[]): TelemetrySink {
  return {
    log(event) { events.push(event); },
    increment() {},
    duration() {},
  };
}

describe("VertexGeminiModelProvider", () => {
  it("requests strict structured output and maps usage metadata", async () => {
    let capturedRequest: Parameters<VertexGeminiClient["models"]["generateContent"]>[0] | undefined;
    const client: VertexGeminiClient = {
      models: {
        async generateContent(input) {
          capturedRequest = input;
          return {
            text: JSON.stringify({
              matchedItemId: selectedId,
              whyThisMatch: "Neon Garden turns bright citrus and basil into a crisp, playful lift for your celebratory mood.",
            }),
            responseId: "vertex-response-1",
            modelVersion: "gemini-2.5-flash-001",
            usageMetadata: {
              promptTokenCount: 123,
              candidatesTokenCount: 32,
              totalTokenCount: 155,
            },
            candidates: [{ finishReason: "STOP" }],
          };
        },
      },
    };
    const events: StructuredLogEvent[] = [];

    const result = await new VertexGeminiModelProvider({
      apiKey: "test-key",
      model: "gemini-2.5-flash",
      client,
      telemetry: captureTelemetry(events),
    }).selectVenueItem(request());

    expect(result.selection.matchedItemId).toBe(selectedId);
    expect(result.metadata).toMatchObject({
      provider: "vertex",
      model: "gemini-2.5-flash",
      attempt: 1,
      promptTokenCount: 123,
      outputTokenCount: 32,
      totalTokenCount: 155,
      responseId: "vertex-response-1",
      modelVersion: "gemini-2.5-flash-001",
      finishReason: "STOP",
    });
    expect(capturedRequest).toMatchObject({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          additionalProperties: false,
          required: ["matchedItemId", "whyThisMatch"],
        },
        candidateCount: 1,
        temperature: 0.2,
        maxOutputTokens: 500,
        httpOptions: { timeout: 8_000 },
      },
    });
    expect(capturedRequest?.config.systemInstruction).toContain("Choose exactly one item");
    expect(capturedRequest?.contents).toContain(selectedId);
    expect(events.map((event) => event.event)).toEqual([
      "tasting_agent_request_started",
      "tasting_agent_request_completed",
    ]);
    expect(events[1]).toMatchObject({
      traceId: "trace-vertex-test",
      provider: "vertex",
      fields: { matchedItemId: selectedId, totalTokenCount: 155 },
    });
  });

  it("uses the Chinese matching instruction when requested", async () => {
    let systemInstruction = "";
    const client: VertexGeminiClient = {
      models: {
        async generateContent(input) {
          systemInstruction = input.config.systemInstruction;
          return {
            text: JSON.stringify({ matchedItemId: selectedId, whyThisMatch: "明亮的柑橘与罗勒香气，很适合今晚轻松又好奇的心情。" }),
          };
        },
      },
    };

    await new VertexGeminiModelProvider({ apiKey: "test-key", model: "gemini-2.5-flash", client })
      .selectVenueItem(request("zh"));

    expect(systemInstruction).toContain("Simplified Chinese");
  });

  it.each([
    ["empty response", { text: "" }],
    ["malformed JSON", { text: "not-json" }],
    ["invalid schema", { text: JSON.stringify({ matchedItemId: "not-a-uuid", whyThisMatch: "Good." }) }],
    ["extra fields", { text: JSON.stringify({ matchedItemId: selectedId, whyThisMatch: "Good.", price: "$1" }) }],
  ])("fails closed on %s", async (_name, response) => {
    const events: StructuredLogEvent[] = [];
    const client: VertexGeminiClient = { models: { generateContent: async () => response } };
    const provider = new VertexGeminiModelProvider({
      apiKey: "test-key",
      model: "gemini-2.5-flash",
      client,
      telemetry: captureTelemetry(events),
    });

    await expect(provider.selectVenueItem(request())).rejects.toMatchObject({
      name: "VertexGeminiProviderError",
      code: "invalid_response",
    });
    expect(events.at(-1)).toMatchObject({
      event: "tasting_agent_request_failed",
      errorCode: "invalid_response",
    });
  });

  it.each([
    [
      "a Markdown JSON fence",
      `\`\`\`json\n${JSON.stringify({
        matchedItemId: selectedId,
        whyThisMatch: "A bright, playful match.",
      })}\n\`\`\``,
    ],
    [
      "one JSON-string wrapper",
      JSON.stringify(JSON.stringify({
        matchedItemId: selectedId,
        whyThisMatch: "A bright, playful match.",
      })),
    ],
  ])("accepts structured output wrapped in %s", async (_name, text) => {
    const client: VertexGeminiClient = {
      models: { generateContent: async () => ({ text }) },
    };

    const result = await new VertexGeminiModelProvider({
      apiKey: "test-key",
      model: "gemini-3.5-flash",
      client,
    }).selectVenueItem(request());

    expect(result.selection.matchedItemId).toBe(selectedId);
  });

  it("logs a sanitized invalid-response diagnostic", async () => {
    const events: StructuredLogEvent[] = [];
    const client: VertexGeminiClient = {
      models: { generateContent: async () => ({ text: "not-json" }) },
    };

    await expect(new VertexGeminiModelProvider({
      apiKey: "test-key",
      model: "gemini-3.5-flash",
      client,
      telemetry: captureTelemetry(events),
    }).selectVenueItem(request())).rejects.toMatchObject({ code: "invalid_response" });

    expect(events.at(-1)).toMatchObject({
      event: "tasting_agent_request_failed",
      fields: { diagnostic: "invalid_json" },
    });
  });

  it("sanitizes provider failures and never repeats the underlying secret-bearing message", async () => {
    const client: VertexGeminiClient = {
      models: {
        async generateContent() {
          throw new Error("request failed for key real-secret-value");
        },
      },
    };
    const provider = new VertexGeminiModelProvider({
      apiKey: "real-secret-value",
      model: "gemini-2.5-flash",
      client,
    });

    const error = await provider.selectVenueItem(request()).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(VertexGeminiProviderError);
    expect(String(error)).not.toContain("real-secret-value");
    expect(error).toMatchObject({ code: "provider_unavailable" });
  });

  it("does not let telemetry failure block a valid recommendation", async () => {
    const client: VertexGeminiClient = {
      models: {
        generateContent: async () => ({
          text: JSON.stringify({ matchedItemId: selectedId, whyThisMatch: "A bright, playful match." }),
        }),
      },
    };
    const telemetry: TelemetrySink = {
      log() { throw new Error("telemetry unavailable"); },
      increment() {},
      duration() {},
    };

    const result = await new VertexGeminiModelProvider({
      apiKey: "test-key",
      model: "gemini-2.5-flash",
      client,
      telemetry,
    }).selectVenueItem(request());

    expect(result.selection.matchedItemId).toBe(selectedId);
  });

  it("suggests editable drink information through the same strict Vertex path", async () => {
    let capturedRequest: Parameters<VertexGeminiClient["models"]["generateContent"]>[0] | undefined;
    const client: VertexGeminiClient = {
      models: {
        async generateContent(input) {
          capturedRequest = input;
          return {
            text: JSON.stringify({
              flavorTags: ["smoky", "rich"],
              baseSpirit: "whiskey",
              strength: "strong",
              recommendationNote: "A slow, spirit-forward pour for settling into the night.",
            }),
          };
        },
      },
    };

    const result = await new VertexGeminiModelProvider({
      apiKey: "test-key",
      model: "gemini-2.5-flash",
      client,
    }).suggestDrinkInfo({
      name: "Smoked Pear Old Fashioned",
      description: "Slow-smoked pear syrup folded into rye.",
      ingredients: ["rye whiskey", "pear syrup"],
      locale: "en",
      traceId: "trace-drink-info",
      timeoutMs: 8_000,
    });

    expect(result.suggestion).toMatchObject({ baseSpirit: "whiskey", strength: "strong" });
    expect(capturedRequest?.config.responseJsonSchema).toMatchObject({
      required: ["flavorTags", "baseSpirit", "strength", "recommendationNote"],
    });
    expect(capturedRequest?.config.systemInstruction).toContain("drink librarian");
  });
});
