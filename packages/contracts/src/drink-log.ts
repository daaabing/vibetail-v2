import { z } from "zod";

/**
 * The consumer drink journal, synced to a signed-in account via /v1/me.
 * Guests without an account keep the on-device journal; these contracts only
 * describe the cloud half.
 */

export const drinkLogSourceSchema = z.enum(["camera", "match"]);
export type DrinkLogSource = z.infer<typeof drinkLogSourceSchema>;

export const drinkLogPhotoContentTypeSchema = z.enum(["image/png", "image/jpeg", "image/webp"]);
export type DrinkLogPhotoContentType = z.infer<typeof drinkLogPhotoContentTypeSchema>;

export const drinkLogEntrySchema = z.object({
  id: z.string().uuid(),
  /** When the guest logged it (client clock); calendars bucket this locally. */
  loggedAt: z.string().datetime({ offset: true }),
  drinkName: z.string().min(1).max(120),
  venueName: z.string().min(1).max(120).nullable(),
  rating: z.number().int().min(1).max(5).nullable(),
  note: z.string().min(1).max(500).nullable(),
  /** Signed URL into the private drink-logs bucket, when a photo was kept. */
  photoUrl: z.string().url().nullable(),
  source: drinkLogSourceSchema,
});
export type DrinkLogEntry = z.infer<typeof drinkLogEntrySchema>;

export const createDrinkLogInputSchema = z.object({
  /**
   * Client-generated so the on-device → cloud migration can re-run safely:
   * re-posting an already-synced entry returns 409 instead of duplicating.
   */
  id: z.string().uuid(),
  loggedAt: z.string().datetime({ offset: true }),
  drinkName: z.string().trim().min(1).max(120),
  venueName: z.string().trim().min(1).max(120).nullable().default(null),
  rating: z.number().int().min(1).max(5).nullable().default(null),
  note: z.string().trim().min(1).max(500).nullable().default(null),
  source: drinkLogSourceSchema.default("camera"),
  photoBase64: z.string().min(1).max(12_000_000).optional(),
  photoContentType: drinkLogPhotoContentTypeSchema.optional(),
}).refine(
  (value) => (value.photoBase64 === undefined) === (value.photoContentType === undefined),
  { message: "photoBase64 and photoContentType travel together" },
);
export type CreateDrinkLogInput = z.infer<typeof createDrinkLogInputSchema>;

export const drinkLogListSchema = z.object({
  entries: z.array(drinkLogEntrySchema),
});
export type DrinkLogList = z.infer<typeof drinkLogListSchema>;

export const DRINK_LOG_API_V1 = {
  collection: "/v1/me/drink-logs",
  entry: "/v1/me/drink-logs/:id",
} as const;
