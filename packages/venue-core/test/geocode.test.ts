import { describe, expect, it } from "vitest";
import { PhotonGeocodeProvider } from "../src/geocode.js";

function photonPayload() {
  return {
    features: [
      {
        geometry: { coordinates: [-73.9871, 40.7191] },
        properties: {
          type: "house", housenumber: "177", street: "Ludlow Street",
          city: "New York", state: "New York", postcode: "10002", country: "United States",
        },
      },
      {
        // POI result: filtered out — the product wants addresses, not names.
        geometry: { coordinates: [-0.0879, 51.5265] },
        properties: { type: "other", name: "Nightjar", city: "London", country: "United Kingdom" },
      },
      {
        geometry: { coordinates: [-0.0885, 51.5268] },
        properties: { type: "street", street: "City Road", city: "London", country: "United Kingdom" },
      },
      {
        // Duplicate label of the row above: deduped.
        geometry: { coordinates: [-0.0886, 51.5269] },
        properties: { type: "street", street: "City Road", city: "London", country: "United Kingdom" },
      },
      {
        // Missing anything label-worthy: dropped.
        geometry: { coordinates: [1, 1] },
        properties: { type: "house" },
      },
    ],
  };
}

function providerWith(payload: unknown, capture?: { url?: string }) {
  return new PhotonGeocodeProvider({
    fetchImpl: (async (input: RequestInfo | URL) => {
      if (capture) capture.url = String(input);
      return new Response(JSON.stringify(payload), { status: 200 });
    }) as typeof fetch,
  });
}

describe("PhotonGeocodeProvider", () => {
  it("normalizes, filters to address layers, and dedupes", async () => {
    const capture: { url?: string } = {};
    const suggestions = await providerWith(photonPayload(), capture).suggest("177 ludlow");
    expect(suggestions).toEqual([
      {
        label: "177 Ludlow Street, New York, 10002, United States",
        latitude: 40.7191,
        longitude: -73.9871,
      },
      {
        label: "City Road, London, United Kingdom",
        latitude: 51.5268,
        longitude: -0.0885,
      },
    ]);
    expect(capture.url).toContain("q=177+ludlow");
    expect(capture.url).toContain("layer=house");
    expect(capture.url).toContain("layer=street");
  });

  it("collapses duplicated locality parts in the label", async () => {
    const suggestions = await providerWith({
      features: [{
        geometry: { coordinates: [114.1694, 22.3193] },
        properties: { type: "street", street: "Nathan Road", district: "Kowloon", city: "Kowloon", country: "China" },
      }],
    }).suggest("nathan road");
    expect(suggestions[0]?.label).toBe("Nathan Road, Kowloon, China");
  });

  it("propagates upstream failures for the route to degrade", async () => {
    const provider = new PhotonGeocodeProvider({
      fetchImpl: (async () => new Response("busy", { status: 503 })) as typeof fetch,
    });
    await expect(provider.suggest("anything")).rejects.toThrow("Geocode upstream responded 503");
  });
});
