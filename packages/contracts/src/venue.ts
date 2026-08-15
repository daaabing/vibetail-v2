import { z } from "zod";

const slugSchema = z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const nullableUrlSchema = z.string().url().nullable();

export const localeSchema = z.enum(["en", "zh"]);
export type Locale = z.infer<typeof localeSchema>;

export const venueSummarySchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  name: z.string().min(1).max(200),
  shortIntro: z.string().max(1_000).nullable(),
  logoUrl: nullableUrlSchema,
  coverImageUrl: nullableUrlSchema,
});
export type VenueSummary = z.infer<typeof venueSummarySchema>;

export const venueMenuSummarySchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  name: z.string().min(1).max(200),
  shortIntro: z.string().max(1_000).nullable(),
  coverImageUrl: nullableUrlSchema,
});
export type VenueMenuSummary = z.infer<typeof venueMenuSummarySchema>;

export const venueDirectoryEntrySchema = z.object({
  venue: venueSummarySchema,
  menus: z.array(venueMenuSummarySchema),
});
export type VenueDirectoryEntry = z.infer<typeof venueDirectoryEntrySchema>;

export const venueMenuItemSchema = z.object({
  id: z.string().uuid(),
  menuId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2_000).nullable(),
  price: z.string().max(100).nullable(),
  imageUrl: nullableUrlSchema,
  alcoholic: z.boolean(),
  baseSpirit: z.string().max(100).nullable(),
  flavorTags: z.array(z.string().min(1).max(80)).max(30),
  moodTags: z.array(z.string().min(1).max(80)).max(30),
  ingredients: z.array(z.string().min(1).max(200)).max(100),
  allergens: z.array(z.string().min(1).max(100)).max(50),
  recommendationPriority: z.number().int(),
  availabilityStatus: z.enum(["active", "sold_out"]),
  section: z.string().max(200).nullable(),
  sortOrder: z.number().int(),
});
export type VenueMenuItem = z.infer<typeof venueMenuItemSchema>;

export const venueMenuSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  name: z.string().min(1).max(200),
  status: z.literal("published"),
  publishedVersionId: z.string().uuid(),
  shortIntro: z.string().max(1_000).nullable(),
  coverImageUrl: nullableUrlSchema,
  fullMenuUrl: nullableUrlSchema,
  fullMenuType: z.enum(["pdf", "image"]).nullable(),
  venue: venueSummarySchema,
  items: z.array(venueMenuItemSchema),
});
export type VenueMenu = z.infer<typeof venueMenuSchema>;

export const venuePreferencesSchema = z
  .object({
    mood: z.string().trim().min(1).max(500).optional(),
    flavors: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
    occasion: z.string().trim().min(1).max(200).optional(),
    alcoholPreference: z.enum(["alcoholic", "non_alcoholic", "either"]).default("either"),
    excludedAllergens: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
    excludedIngredients: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
    freeText: z.string().trim().min(1).max(500).optional(),
    locale: localeSchema.default("en"),
  })
  .refine(
    (value) => Boolean(value.mood || value.occasion || value.freeText || value.flavors.length > 0),
    { message: "At least one preference signal is required" },
  );
export type VenuePreferences = z.infer<typeof venuePreferencesSchema>;

export const venueMatchRequestSchema = z.object({
  merchantSlug: slugSchema,
  menuSlug: slugSchema,
  preferences: venuePreferencesSchema,
});
export type VenueMatchRequest = z.infer<typeof venueMatchRequestSchema>;

export const globalMatchRequestSchema = z.object({
  preferences: venuePreferencesSchema,
});
export type GlobalMatchRequest = z.infer<typeof globalMatchRequestSchema>;

export const modelMatchSelectionSchema = z.object({
  matchedItemId: z.string().uuid(),
  whyThisMatch: z.string().trim().min(1).max(1_000),
});
export type ModelMatchSelection = z.infer<typeof modelMatchSelectionSchema>;

export const venueMatchResultSchema = z.object({
  venue: venueSummarySchema,
  menu: z.object({
    id: z.string().uuid(),
    slug: slugSchema,
    name: z.string().min(1).max(200),
  }),
  item: venueMenuItemSchema,
  whyThisMatch: z.string().trim().min(1).max(1_000),
  traceId: z.string().min(1).max(200),
  // Present when the server recorded the match for venue analytics; feedback needs it.
  matchId: z.string().uuid().optional(),
});
export type VenueMatchResult = z.infer<typeof venueMatchResultSchema>;

export const globalMatchResultSchema = venueMatchResultSchema.extend({
  venueSpecificUrl: z.string().regex(/^\/m\/[a-z0-9-]+\/[a-z0-9-]+$/),
});
export type GlobalMatchResult = z.infer<typeof globalMatchResultSchema>;

export const venueErrorCodeSchema = z.enum([
  "INVALID_REQUEST",
  "MERCHANT_NOT_FOUND",
  "MERCHANT_INACTIVE",
  "MENU_NOT_FOUND",
  "MENU_UNPUBLISHED",
  "MENU_EMPTY",
  "NO_PUBLISHED_MENU",
  "MATCH_NOT_FOUND",
  "NO_ACTIVE_ITEMS",
  "GLOBAL_NO_CANDIDATES",
  "MATCH_PROVIDER_UNAVAILABLE",
  "INVALID_MATCH_SELECTION",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "CONFLICT",
  "RATE_LIMITED",
  "INTERNAL_ERROR",
]);
export type VenueErrorCode = z.infer<typeof venueErrorCodeSchema>;

export const venueErrorSchema = z.object({
  code: venueErrorCodeSchema,
  message: z.string().min(1).max(500),
  retryable: z.boolean(),
  traceId: z.string().min(1).max(200).optional(),
});
export type VenueError = z.infer<typeof venueErrorSchema>;

export const menuViewEventSchema = z.object({
  merchantSlug: slugSchema,
  menuId: z.string().uuid().optional(),
});
export type MenuViewEvent = z.infer<typeof menuViewEventSchema>;

export const feedbackInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1).max(1_000).optional(),
});
export type FeedbackInput = z.infer<typeof feedbackInputSchema>;

export const feedbackReceiptSchema = z.object({
  matchId: z.string().uuid(),
  status: z.literal("recorded"),
});
export type FeedbackReceipt = z.infer<typeof feedbackReceiptSchema>;

export interface VenueClient {
  listActiveVenues(): Promise<VenueDirectoryEntry[]>;
  getVenue(merchantSlug: string): Promise<VenueDirectoryEntry>;
  getPublishedMenu(merchantSlug: string, menuSlug: string): Promise<VenueMenu>;
  /** Resolves the venue's currently published menu; stable QR target. */
  getCurrentMenu(merchantSlug: string): Promise<VenueMenu>;
  matchGlobal(preferences: VenuePreferences): Promise<GlobalMatchResult>;
  matchItem(
    merchantSlug: string,
    menuSlug: string,
    preferences: VenuePreferences,
  ): Promise<VenueMatchResult>;
  /** Fire-and-forget usage beacon; must never surface errors to guests. */
  recordMenuView(event: MenuViewEvent): void;
  submitFeedback(matchId: string, input: FeedbackInput): Promise<FeedbackReceipt>;
}

export const VENUE_API_V1 = {
  venues: "/v1/venues",
  venue: "/v1/venues/:merchantSlug",
  globalMatch: "/v1/matches/global",
  menu: "/v1/venues/:merchantSlug/menus/:menuSlug",
  match: "/v1/venues/:merchantSlug/menus/:menuSlug/match",
  page: "/m/:merchantSlug/:menuSlug",
} as const;
