import { geocodeSuggestionSchema, type GeocodeSuggestion } from "@vibetail/contracts";
import { z } from "zod";

/**
 * Address autocomplete behind a provider interface so the upstream service
 * can change (Photon → LocationIQ → Google) without touching routes or UI.
 *
 * The default upstream is the public Photon instance (photon.komoot.io):
 * OSM data, typeahead-friendly, no API key. Point GEOCODE_BASE_URL at a
 * self-hosted Photon or a different proxy when volume outgrows it.
 */

export interface GeocodeProvider {
  suggest(query: string): Promise<GeocodeSuggestion[]>;
}

const photonResponseSchema = z.object({
  features: z.array(z.object({
    geometry: z.object({
      coordinates: z.tuple([z.number(), z.number()]).rest(z.number()),
    }),
    properties: z.object({
      type: z.string().optional(),
      name: z.string().optional(),
      housenumber: z.string().optional(),
      street: z.string().optional(),
      district: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postcode: z.string().optional(),
      country: z.string().optional(),
    }),
  })),
});

/** Address layers only — the product wants street addresses, not POI names. */
const ADDRESS_TYPES = new Set(["house", "street"]);
const MAX_SUGGESTIONS = 6;

export interface PhotonGeocodeProviderConfig {
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export class PhotonGeocodeProvider implements GeocodeProvider {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(config: PhotonGeocodeProviderConfig = {}) {
    this.baseUrl = (config.baseUrl ?? "https://photon.komoot.io").replace(/\/+$/, "");
    this.timeoutMs = config.timeoutMs ?? 4_000;
    this.fetchImpl = config.fetchImpl ?? fetch;
  }

  async suggest(query: string): Promise<GeocodeSuggestion[]> {
    const url = new URL(`${this.baseUrl}/api/`);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "10");
    url.searchParams.set("lang", "en");
    // Ask the upstream for address layers; the response is filtered again
    // below in case the instance ignores the parameter.
    url.searchParams.append("layer", "house");
    url.searchParams.append("layer", "street");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(url, {
        signal: controller.signal,
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error(`Geocode upstream responded ${response.status}`);
      const parsed = photonResponseSchema.parse(await response.json());

      const seen = new Set<string>();
      const suggestions: GeocodeSuggestion[] = [];
      for (const feature of parsed.features) {
        const { properties } = feature;
        if (properties.type && !ADDRESS_TYPES.has(properties.type)) continue;
        const label = buildLabel(properties);
        if (!label || seen.has(label)) continue;
        const [longitude, latitude] = feature.geometry.coordinates;
        const candidate = geocodeSuggestionSchema.safeParse({ label, latitude, longitude });
        if (!candidate.success) continue;
        seen.add(label);
        suggestions.push(candidate.data);
        if (suggestions.length >= MAX_SUGGESTIONS) break;
      }
      return suggestions;
    } finally {
      clearTimeout(timer);
    }
  }
}

function buildLabel(properties: {
  name?: string | undefined; housenumber?: string | undefined; street?: string | undefined;
  district?: string | undefined; city?: string | undefined; state?: string | undefined;
  postcode?: string | undefined; country?: string | undefined;
}): string {
  const streetLine = properties.housenumber && properties.street
    ? `${properties.housenumber} ${properties.street}`
    : properties.street ?? properties.name ?? "";
  const parts = [streetLine, properties.district, properties.city, properties.state, properties.postcode, properties.country]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));
  // Drop consecutive duplicates like district === city.
  const deduped = parts.filter((part, index) => parts.indexOf(part) === index);
  return deduped.join(", ").slice(0, 300);
}
