import { z } from "zod";

/**
 * Address autocomplete for venue onboarding. The server proxies a geocoding
 * provider (Photon by default) and normalizes results to this shape, so the
 * provider can change without touching any client.
 */

export const geocodeSuggestionSchema = z.object({
  /** Human-readable address line, e.g. "129 City Road, London, EC1V 1JB, United Kingdom". */
  label: z.string().min(1).max(300),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});
export type GeocodeSuggestion = z.infer<typeof geocodeSuggestionSchema>;

export const geocodeSuggestListSchema = z.object({
  suggestions: z.array(geocodeSuggestionSchema).max(8),
});
export type GeocodeSuggestList = z.infer<typeof geocodeSuggestListSchema>;
