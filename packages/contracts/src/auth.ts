import { z } from "zod";

/**
 * Runtime auth configuration served to the browser at `GET /v1/config`.
 * Only publishable values appear here; the service-role key never leaves the server.
 * `none` keeps the passwordless account-name login used by local development runs.
 */
export const authConfigSchema = z.object({
  appUrl: z.string().url(),
  provider: z.enum(["none", "supabase"]),
  supabaseUrl: z.string().url().nullable().default(null),
  supabasePublishableKey: z.string().min(1).nullable().default(null),
});
export type AuthConfig = z.infer<typeof authConfigSchema>;

/**
 * Basemap settings. The Google key is a browser key restricted by HTTP
 * referrer, so it belongs in the publishable config exactly like the Supabase
 * one; null means this deployment has no key and the map falls back to the
 * proxied OSM tiles.
 */
export const mapsConfigSchema = z.object({
  googleApiKey: z.string().min(1).nullable().default(null),
});
export type MapsConfig = z.infer<typeof mapsConfigSchema>;

export const runtimeConfigSchema = z.object({
  auth: authConfigSchema,
  // Defaulted so a new client reading an older server still parses.
  maps: mapsConfigSchema.default({ googleApiKey: null }),
});
export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;
