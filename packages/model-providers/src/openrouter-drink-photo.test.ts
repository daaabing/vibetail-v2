import { describe, expect, it } from "vitest";
import {
  buildOpenRouterCutoutPrompt,
  defaultOpenRouterCutoutModel,
  OpenRouterDrinkPhotoProvider,
} from "./openrouter-drink-photo.js";
import type { DrinkPhotoRequest } from "./drink-photo.js";

function requestFixture(): DrinkPhotoRequest {
  return {
    name: "The Yak",
    description: "Baijiu with ginger beer.",
    image: { bytes: Uint8Array.from([1, 2, 3]), contentType: "image/jpeg" },
    traceId: "trace-1",
    timeoutMs: 5_000,
  };
}

describe("openrouter drink photo", () => {
  it("builds a cutout prompt that pins the subject and forbids invention", () => {
    const prompt = buildOpenRouterCutoutPrompt("The Yak", "Baijiu with ginger beer.");
    expect(prompt).toContain("The Yak — Baijiu with ginger beer.");
    expect(prompt).toContain("transparent background");
    expect(prompt).toContain("Do not restyle");
    expect(prompt).not.toMatch(/Reconstruct|Source notes/i);
  });

  it("requests a transparent png edit and decodes the returned image", async () => {
    const calls: Array<{ url: string; init: RequestInit }> = [];
    const provider = new OpenRouterDrinkPhotoProvider({
      apiKey: "key-1",
      siteUrl: "https://vibetail.example",
      fetchImpl: (async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), init: init ?? {} });
        return new Response(
          JSON.stringify({ data: [{ b64_json: Buffer.from([9, 9]).toString("base64") }] }),
          { status: 200 },
        );
      }) as typeof fetch,
    });

    const prepared = await provider.prepareDrinkPhoto(requestFixture());

    expect(prepared.backgroundRemoved).toBe(true);
    expect(prepared.contentType).toBe("image/png");
    expect(Array.from(prepared.bytes)).toEqual([9, 9]);

    expect(calls).toHaveLength(1);
    const call = calls[0]!;
    expect(call.url).toBe("https://openrouter.ai/api/v1/images");
    const headers = call.init.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer key-1");
    expect(headers["HTTP-Referer"]).toBe("https://vibetail.example");
    const body = JSON.parse(String(call.init.body)) as Record<string, unknown>;
    expect(body.model).toBe(defaultOpenRouterCutoutModel);
    expect(body.background).toBe("transparent");
    expect(body.output_format).toBe("png");
    expect(body.input_references).toEqual([
      { type: "image_url", image_url: { url: `data:image/jpeg;base64,${Buffer.from([1, 2, 3]).toString("base64")}` } },
    ]);
  });

  it("throws on a failed response", async () => {
    const provider = new OpenRouterDrinkPhotoProvider({
      apiKey: "key-1",
      fetchImpl: (async () => new Response("quota exceeded", { status: 429 })) as typeof fetch,
    });
    await expect(provider.prepareDrinkPhoto(requestFixture())).rejects.toThrow(
      /OpenRouter image cutout failed \(429\): quota exceeded/,
    );
  });

  it("throws when the response carries no image", async () => {
    const provider = new OpenRouterDrinkPhotoProvider({
      apiKey: "key-1",
      fetchImpl: (async () => new Response(JSON.stringify({ data: [] }), { status: 200 })) as typeof fetch,
    });
    await expect(provider.prepareDrinkPhoto(requestFixture())).rejects.toThrow(
      "OpenRouter image cutout returned no image",
    );
  });
});
