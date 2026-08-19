import { z } from "zod";

/**
 * Runtime auth configuration served to the browser at `GET /v1/config`.
 * Only publishable values appear here; the service-role key never leaves the server.
 * `none` keeps the passwordless account-name login used by local development runs.
 */
export const authConfigSchema = z.object({
  provider: z.enum(["none", "supabase"]),
  supabaseUrl: z.string().url().nullable().default(null),
  supabasePublishableKey: z.string().min(1).nullable().default(null),
});
export type AuthConfig = z.infer<typeof authConfigSchema>;

export const runtimeConfigSchema = z.object({
  auth: authConfigSchema,
});
export type RuntimeConfig = z.infer<typeof runtimeConfigSchema>;
