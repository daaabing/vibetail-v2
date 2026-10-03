import { z } from "zod";

export const tarotEventId = "tarot-night-2026-10-03" as const;
export const tarotEventIdSchema = z.literal(tarotEventId);
export const tarotElementSchema = z.enum(["火", "风", "水", "土"]);
export const tarotOrientationSchema = z.enum(["upright", "reversed"]);

export const tarotSessionInputSchema = z.object({
  // Email is the stable event identity: it restores a returning guest and
  // prevents either of their two drinks from being matched twice.
  email: z.string().trim().email().max(320),
  displayName: z.string().trim().min(1).max(120),
});

export const tarotGuestSchema = z.object({
  attendeeId: z.string().uuid().optional(),
  email: z.string().email().optional(),
  displayName: z.string().trim().min(1).max(120),
  zodiac: z.string().trim().min(1).max(40),
  element: tarotElementSchema,
  task: z.string().trim().min(1).max(1_000),
});

export const tarotTextureTags = ["清爽", "顺滑", "浓郁", "有气泡"] as const;
export const tarotNoteTags = ["柑橘", "热带水果", "花香", "姜味", "草本", "奶油甜香"] as const;
// Kept as a compatibility field for existing rows and older clients. New
// clients should send the more useful texture/note fields below.
export const tarotFlavorTags = ["清爽", "果香", "花香", "烟熏", "浓郁", "苦甜", "奶油", "无酒精"] as const;
export const tarotDrinkPreferencesSchema = z.object({
  textures: z.array(z.enum(tarotTextureTags)).min(1).max(3),
  notes: z.array(z.enum(tarotNoteTags)).min(1).max(4),
  description: z.string().trim().max(500).default(""),
  flavorTags: z.array(z.enum(tarotFlavorTags)).max(8).default([]),
});

export const tarotSessionResponseSchema = z.object({
  guest: tarotGuestSchema,
  expiresAt: z.string().datetime(),
  needsPreferences: z.boolean(),
  preferences: tarotDrinkPreferencesSchema.nullable().optional(),
});

export const tarotDrawInputSchema = z.object({
  cardId: z.string().trim().regex(/^[a-z0-9-]+$/).max(80),
  orientation: tarotOrientationSchema.default("upright"),
});

export const tarotDrawResponseSchema = tarotDrawInputSchema.extend({
  guest: tarotGuestSchema,
});

export const tarotPhysicalCardInputSchema = z.object({
  cardId: z.string().trim().regex(/^[a-z0-9-]+$/).max(80),
  orientation: tarotOrientationSchema.default("upright"),
});

export const tarotRoundSchema = z.enum(["first", "second"]);
export const tarotDrinkSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.string().nullable(),
  imageUrl: z.string().nullable(),
  flavorTags: z.array(z.string()),
  recommendationNote: z.string().nullable(),
});
export const tarotReadingInputSchema = z.object({
  cardId: z.string().trim().regex(/^[a-z0-9-]+$/).max(80),
  question: z.string().trim().min(2).max(500),
  spreadId: z.string().trim().regex(/^[a-z0-9-]+$/).max(80).optional(),
  spreadName: z.string().trim().max(120).optional(),
  draws: z.array(tarotDrawInputSchema.extend({
    positionId: z.string().trim().max(80),
    positionLabel: z.string().trim().max(120),
    positionMeaning: z.string().trim().max(300).optional(),
  })).min(1).max(13).optional(),
});

export const tarotReadingSchema = z.object({
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2_000),
  reflection: z.string().trim().min(1).max(500),
});

export const tarotRoundResultSchema = z.object({
  round: tarotRoundSchema,
  cardId: z.string(),
  orientation: tarotOrientationSchema,
  reading: tarotReadingSchema,
  spreadId: z.string().optional(),
  spreadName: z.string().optional(),
  draws: z.array(tarotDrawInputSchema.extend({ positionId: z.string(), positionLabel: z.string(), positionMeaning: z.string().optional() })).optional(),
  readings: z.array(tarotReadingSchema).optional(),
  drink: tarotDrinkSchema,
});

export const tarotReadingResponseSchema = z.object({
  cardId: z.string(),
  reading: tarotReadingSchema,
});

export const tarotConsentInputSchema = z.object({
  marketingOptIn: z.boolean(),
});

export type TarotGuest = z.infer<typeof tarotGuestSchema>;
export type TarotOrientation = z.infer<typeof tarotOrientationSchema>;
export type TarotReading = z.infer<typeof tarotReadingSchema>;
export type TarotDrink = z.infer<typeof tarotDrinkSchema>;
export type TarotRound = z.infer<typeof tarotRoundSchema>;
export type TarotDrinkPreferences = z.infer<typeof tarotDrinkPreferencesSchema>;
