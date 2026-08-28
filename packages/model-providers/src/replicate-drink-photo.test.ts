import { describe, expect, it } from "vitest";
import { defaultReplicateCutoutModel, ReplicateDrinkPhotoProvider } from "./replicate-drink-photo.js";
import type { DrinkPhotoRequest } from "./drink-photo.js";

function requestFixture(): DrinkPhotoRequest {
  return {
    name: "The Yak",
    description: "Baijiu with ginger beer.",
    image: { bytes: Uint8Array.from([1, 2, 3]), contentType: "image/jpeg" },
    traceId: "trace-1",
    timeoutMs: 10_000,
  };
}

interface Call {
  url: string;
  init: RequestInit;
}

function providerWith(
  routes: (url: string, init: RequestInit) => Response | Promise<Response>,
  calls: Call[],
): ReplicateDrinkPhotoProvider {
  return new ReplicateDrinkPhotoProvider({
    apiToken: "r8_test",
    pollIntervalMs: 1,
    fetchImpl: (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: String(url), init: init ?? {} });
      return routes(String(url), init ?? {});
    }) as typeof fetch,
  });
}

const fileUploadResponse = () =>
  new Response(JSON.stringify({ urls: { get: "https://api.replicate.com/v1/files/f1" } }), { status: 201 });

const outputBytes = Uint8Array.from([7, 7, 7]);
const deliveryResponse = () => new Response(outputBytes.slice().buffer, { status: 200 });

describe("replicate drink photo", () => {
  it("uploads the photo, runs the model synchronously, and downloads the cutout", async () => {
    const calls: Call[] = [];
    const provider = providerWith((url) => {
      if (url.endsWith("/files")) return fileUploadResponse();
      if (url.endsWith("/predictions")) {
        return new Response(
          JSON.stringify({ status: "succeeded", output: "https://replicate.delivery/out.png" }),
          { status: 201 },
        );
      }
      return deliveryResponse();
    }, calls);

    const prepared = await provider.prepareDrinkPhoto(requestFixture());

    expect(prepared.backgroundRemoved).toBe(true);
    expect(prepared.contentType).toBe("image/png");
    expect(Array.from(prepared.bytes)).toEqual([7, 7, 7]);

    expect(calls.map((call) => call.url)).toEqual([
      "https://api.replicate.com/v1/files",
      `https://api.replicate.com/v1/models/${defaultReplicateCutoutModel}/predictions`,
      "https://replicate.delivery/out.png",
    ]);

    const upload = calls[0]!;
    expect(upload.init.body).toBeInstanceOf(FormData);
    const content = (upload.init.body as FormData).get("content");
    expect(content).toBeInstanceOf(Blob);
    expect((content as Blob).type).toBe("image/jpeg");
    const uploadHeaders = upload.init.headers as Record<string, string>;
    expect(uploadHeaders.authorization).toBe("Bearer r8_test");
    expect(uploadHeaders["content-type"]).toBeUndefined();

    const predict = calls[1]!;
    const predictHeaders = predict.init.headers as Record<string, string>;
    expect(predictHeaders.Prefer).toMatch(/^wait=\d+$/);
    const body = JSON.parse(String(predict.init.body)) as Record<string, unknown>;
    expect(body.input).toEqual({ image: "https://api.replicate.com/v1/files/f1" });
    expect(body.version).toBeUndefined();

    const download = calls[2]!;
    expect(download.init.headers).toBeUndefined();
  });

  it("polls after an incomplete sync response until the output lands", async () => {
    const calls: Call[] = [];
    let polls = 0;
    const provider = providerWith((url) => {
      if (url.endsWith("/files")) return fileUploadResponse();
      if (url.endsWith("/predictions")) {
        return new Response(
          JSON.stringify({ status: "processing", output: null, urls: { get: "https://api.replicate.com/v1/predictions/p1" } }),
          { status: 202 },
        );
      }
      if (url.endsWith("/predictions/p1")) {
        polls += 1;
        if (polls < 2) {
          return new Response(
            JSON.stringify({ status: "processing", output: null, urls: { get: "https://api.replicate.com/v1/predictions/p1" } }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({ status: "processing", output: ["https://replicate.delivery/out.png"] }),
          { status: 200 },
        );
      }
      return deliveryResponse();
    }, calls);

    const prepared = await provider.prepareDrinkPhoto(requestFixture());
    expect(Array.from(prepared.bytes)).toEqual([7, 7, 7]);
    expect(polls).toBe(2);
  });

  it("runs community models with a version hash through the generic endpoint", async () => {
    const calls: Call[] = [];
    const provider = new ReplicateDrinkPhotoProvider({
      apiToken: "r8_test",
      model: "851-labs/background-remover:a029dff3",
      pollIntervalMs: 1,
      fetchImpl: (async (url: string | URL | Request, init?: RequestInit) => {
        calls.push({ url: String(url), init: init ?? {} });
        if (String(url).endsWith("/files")) return fileUploadResponse();
        if (String(url).endsWith("/predictions")) {
          return new Response(
            JSON.stringify({ status: "succeeded", output: "https://replicate.delivery/out.png" }),
            { status: 201 },
          );
        }
        return deliveryResponse();
      }) as typeof fetch,
    });

    await provider.prepareDrinkPhoto(requestFixture());
    expect(calls[1]!.url).toBe("https://api.replicate.com/v1/predictions");
    const body = JSON.parse(String(calls[1]!.init.body)) as Record<string, unknown>;
    expect(body.version).toBe("a029dff3");
  });

  it("surfaces a failed prediction with its error", async () => {
    const provider = providerWith((url) => {
      if (url.endsWith("/files")) return fileUploadResponse();
      return new Response(
        JSON.stringify({ status: "failed", output: null, error: "E1001 model OOM" }),
        { status: 201 },
      );
    }, []);
    await expect(provider.prepareDrinkPhoto(requestFixture())).rejects.toThrow(
      "Replicate prediction failed: E1001 model OOM",
    );
  });

  it("surfaces problem+json details on HTTP errors", async () => {
    const provider = providerWith(
      () => new Response(JSON.stringify({ detail: "Files must be less than 100MB in size" }), { status: 413 }),
      [],
    );
    await expect(provider.prepareDrinkPhoto(requestFixture())).rejects.toThrow(
      "Replicate request failed (413): Files must be less than 100MB in size",
    );
  });
});
