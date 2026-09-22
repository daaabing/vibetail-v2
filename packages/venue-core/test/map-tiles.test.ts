import { describe, expect, it } from "vitest";
import { RasterMapTileProvider, assertTileCoordinates } from "../src/map-tiles.js";

function providerWith(response: Response, capture?: { url?: string; headers?: HeadersInit }) {
  return new RasterMapTileProvider({
    baseUrl: "https://tiles.example.com/light/",
    fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (capture) {
        capture.url = String(input);
        capture.headers = init?.headers ?? {};
      }
      return response;
    }) as typeof fetch,
  });
}

function pngResponse(bytes: number[], contentType = "image/png") {
  return new Response(Uint8Array.from(bytes), { status: 200, headers: { "content-type": contentType } });
}

describe("RasterMapTileProvider", () => {
  it("fetches {z}/{x}/{y}.png from the configured upstream with an identifying agent", async () => {
    const capture: { url?: string; headers?: HeadersInit } = {};
    const tile = await providerWith(pngResponse([137, 80, 78, 71]), capture).fetchTile(17, 20984, 50673);

    // The trailing slash on the configured base URL must not double up.
    expect(capture.url).toBe("https://tiles.example.com/light/17/20984/50673.png");
    expect((capture.headers as Record<string, string>)["user-agent"]).toContain("Vibetail");
    expect(tile.contentType).toBe("image/png");
    expect([...tile.body]).toEqual([137, 80, 78, 71]);
  });

  it("falls back to image/png when the upstream omits a content type", async () => {
    const response = new Response(Uint8Array.from([1, 2]), { status: 200 });
    response.headers.delete("content-type");
    expect((await providerWith(response).fetchTile(0, 0, 0)).contentType).toBe("image/png");
  });

  it("rejects upstream errors and coordinates off the map", async () => {
    const failing = providerWith(new Response("blocked", { status: 403 }));
    await expect(failing.fetchTile(17, 20984, 50673)).rejects.toThrow("403");

    const ok = providerWith(pngResponse([1]));
    // 2^17 tiles per side means 131072 is one past the edge, and zoom 20 is
    // deeper than raster upstreams render.
    await expect(ok.fetchTile(17, 131072, 0)).rejects.toThrow(RangeError);
    await expect(ok.fetchTile(20, 1, 1)).rejects.toThrow(RangeError);
    await expect(ok.fetchTile(17, 1.5, 1)).rejects.toThrow(RangeError);
    expect(() => assertTileCoordinates(0, 0, 0)).not.toThrow();
  });
});
