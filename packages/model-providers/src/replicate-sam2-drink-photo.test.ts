import sharp from "sharp";
import { describe, expect, it } from "vitest";
import {
  buildReplicateSam2TextPrompt,
  defaultReplicateSam2Model,
  ReplicateSam2DrinkPhotoProvider,
} from "./replicate-sam2-drink-photo.js";
import type { DrinkPhotoRequest } from "./drink-photo.js";

async function requestFixture(): Promise<DrinkPhotoRequest> {
  const image = await sharp({ create: { width: 20, height: 20, channels: 3, background: { r: 10, g: 120, b: 200 } } })
    .jpeg()
    .toBuffer();
  return {
    name: "The Yak",
    description: "Baijiu with ginger beer.",
    image: { bytes: new Uint8Array(image), contentType: "image/jpeg" },
    traceId: "trace-1",
    timeoutMs: 10_000,
  };
}

async function maskPng(): Promise<Buffer> {
  const raw = Buffer.alloc(20 * 20);
  for (let y = 5; y < 15; y += 1) for (let x = 5; x < 15; x += 1) raw[y * 20 + x] = 255;
  return sharp(raw, { raw: { width: 20, height: 20, channels: 1 } }).png().toBuffer();
}

describe("replicate sam2 drink photo", () => {
  it("asks GroundingDINO for the complete assembled drink", () => {
    const prompt = buildReplicateSam2TextPrompt();
    const targets = prompt.split(",");

    expect(targets.length).toBeGreaterThan(40);
    expect(new Set(targets).size).toBe(targets.length);
    expect(prompt.length).toBeLessThan(700);
    expect(targets).toContain("cocktail glass");
    expect(targets).toContain("coupe glass");
    expect(targets).toContain("tiki mug");
    expect(targets).toContain("mug");
    expect(targets).toContain("ice");
    expect(targets).toContain("cocktail foam");
    expect(targets).toContain("cocktail garnish");
    expect(targets).toContain("fruit garnish");
    expect(targets).toContain("herb garnish");
    expect(targets).toContain("decorated rim");
    expect(targets).toContain("cherry");
    expect(targets).toContain("citrus peel");
    expect(targets).toContain("pineapple");
    expect(targets).toContain("mint leaves");
    expect(targets).toContain("edible flower");
    expect(targets).toContain("cocktail pick");
    expect(targets).toContain("straw");
    expect(targets).toContain("cocktail umbrella");
  });

  it("uploads the photo, runs lang-segment-anything, and composites the mask cutout", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const mask = await maskPng();
    const provider = new ReplicateSam2DrinkPhotoProvider({
      apiToken: "r8_test",
      pollIntervalMs: 1,
      fetchImpl: (async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), init: init ?? {} });
        if (String(url).endsWith("/files")) {
          return new Response(JSON.stringify({ urls: { get: "https://api.replicate.com/v1/files/f1" } }), {
            status: 201,
          });
        }
        if (String(url).endsWith("/predictions")) {
          return new Response(
            JSON.stringify({ status: "succeeded", output: "https://replicate.delivery/mask.png" }),
            { status: 201 },
          );
        }
        return new Response(Uint8Array.from(mask), { status: 200 });
      }) as typeof fetch,
    });

    const prepared = await provider.prepareDrinkPhoto(await requestFixture());

    expect(prepared.backgroundRemoved).toBe(true);
    expect(prepared.contentType).toBe("image/png");
    const meta = await sharp(Buffer.from(prepared.bytes)).metadata();
    expect(meta.hasAlpha).toBe(true);
    expect(meta.width).toBe(10);
    expect(meta.height).toBe(10);

    // Community model → one compact caption through the generic endpoint.
    const predictCalls = calls.filter((call) => call.url.endsWith("/predictions"));
    expect(predictCalls).toHaveLength(1);
    const body = JSON.parse(String(predictCalls[0]!.init.body)) as {
      version?: string;
      input?: { image?: string; text_prompt?: string };
    };
    expect(body.version).toBe(defaultReplicateSam2Model.split(":")[1]);
    expect(body.input?.image).toBe("https://api.replicate.com/v1/files/f1");
    expect(body.input?.text_prompt).toBe(buildReplicateSam2TextPrompt());
  });

  it("fails when the model finds no usable subject", async () => {
    const emptyMask = await sharp(Buffer.alloc(20 * 20), { raw: { width: 20, height: 20, channels: 1 } })
      .png()
      .toBuffer();
    const provider = new ReplicateSam2DrinkPhotoProvider({
      apiToken: "r8_test",
      pollIntervalMs: 1,
      fetchImpl: (async (url: string | URL | Request) => {
        if (String(url).endsWith("/files")) {
          return new Response(JSON.stringify({ urls: { get: "https://api.replicate.com/v1/files/f1" } }), {
            status: 201,
          });
        }
        if (String(url).endsWith("/predictions")) {
          return new Response(
            JSON.stringify({ status: "succeeded", output: "https://replicate.delivery/mask.png" }),
            { status: 201 },
          );
        }
        return new Response(Uint8Array.from(emptyMask), { status: 200 });
      }) as typeof fetch,
    });

    await expect(provider.prepareDrinkPhoto(await requestFixture())).rejects.toThrow(
      /not a usable drink silhouette/,
    );
  });
});
