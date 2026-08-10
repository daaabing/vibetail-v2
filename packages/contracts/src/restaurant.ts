import { z } from "zod";

const slugSchema = z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const nullableUrlSchema = z.string().url().nullable();

export const localeSchema = z.enum(["en", "zh"]);
export type Locale = z.infer<typeof localeSchema>;

export const restaurantSummarySchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  name: z.string().min(1).max(200),
  shortIntro: z.string().max(1_000).nullable(),
  logoUrl: nullableUrlSchema,
  coverImageUrl: nullableUrlSchema,
});
export type RestaurantSummary = z.infer<typeof restaurantSummarySchema>;

export const restaurantMenuSummarySchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  name: z.string().min(1).max(200),
  shortIntro: z.string().max(1_000).nullable(),
  coverImageUrl: nullableUrlSchema,
});
export type RestaurantMenuSummary = z.infer<typeof restaurantMenuSummarySchema>;

export const restaurantDirectoryEntrySchema = z.object({
  restaurant: restaurantSummarySchema,
  menus: z.array(restaurantMenuSummarySchema),
});
export type RestaurantDirectoryEntry = z.infer<typeof restaurantDirectoryEntrySchema>;

export const restaurantMenuItemSchema = z.object({
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
export type RestaurantMenuItem = z.infer<typeof restaurantMenuItemSchema>;

export const restaurantMenuSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  name: z.string().min(1).max(200),
  status: z.literal("published"),
  publishedVersionId: z.string().uuid(),
  shortIntro: z.string().max(1_000).nullable(),
  coverImageUrl: nullableUrlSchema,
  fullMenuUrl: nullableUrlSchema,
  fullMenuType: z.enum(["pdf", "image"]).nullable(),
  restaurant: restaurantSummarySchema,
  items: z.array(restaurantMenuItemSchema),
});
export type RestaurantMenu = z.infer<typeof restaurantMenuSchema>;

export const restaurantPreferencesSchema = z
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
export type RestaurantPreferences = z.infer<typeof restaurantPreferencesSchema>;

export const restaurantMatchRequestSchema = z.object({
  merchantSlug: slugSchema,
  menuSlug: slugSchema,
  preferences: restaurantPreferencesSchema,
});
export type RestaurantMatchRequest = z.infer<typeof restaurantMatchRequestSchema>;

export const globalMatchRequestSchema = z.object({
  preferences: restaurantPreferencesSchema,
});
export type GlobalMatchRequest = z.infer<typeof globalMatchRequestSchema>;

export const modelMatchSelectionSchema = z.object({
  matchedItemId: z.string().uuid(),
  whyThisMatch: z.string().trim().min(1).max(1_000),
});
export type ModelMatchSelection = z.infer<typeof modelMatchSelectionSchema>;

export const restaurantMatchResultSchema = z.object({
  restaurant: restaurantSummarySchema,
  menu: z.object({
    id: z.string().uuid(),
    slug: slugSchema,
    name: z.string().min(1).max(200),
  }),
  item: restaurantMenuItemSchema,
  whyThisMatch: z.string().trim().min(1).max(1_000),
  traceId: z.string().min(1).max(200),
});
export type RestaurantMatchResult = z.infer<typeof restaurantMatchResultSchema>;

export const globalMatchResultSchema = restaurantMatchResultSchema.extend({
  restaurantSpecificUrl: z.string().regex(/^\/m\/[a-z0-9-]+\/[a-z0-9-]+$/),
});
export type GlobalMatchResult = z.infer<typeof globalMatchResultSchema>;

export const restaurantErrorCodeSchema = z.enum([
  "INVALID_REQUEST",
  "MERCHANT_NOT_FOUND",
  "MERCHANT_INACTIVE",
  "MENU_NOT_FOUND",
  "MENU_UNPUBLISHED",
  "MENU_EMPTY",
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
export type RestaurantErrorCode = z.infer<typeof restaurantErrorCodeSchema>;

export const restaurantErrorSchema = z.object({
  code: restaurantErrorCodeSchema,
  message: z.string().min(1).max(500),
  retryable: z.boolean(),
  traceId: z.string().min(1).max(200).optional(),
});
export type RestaurantError = z.infer<typeof restaurantErrorSchema>;

export interface RestaurantClient {
  listActiveRestaurants(): Promise<RestaurantDirectoryEntry[]>;
  getRestaurant(merchantSlug: string): Promise<RestaurantDirectoryEntry>;
  getPublishedMenu(merchantSlug: string, menuSlug: string): Promise<RestaurantMenu>;
  matchGlobal(preferences: RestaurantPreferences): Promise<GlobalMatchResult>;
  matchItem(
    merchantSlug: string,
    menuSlug: string,
    preferences: RestaurantPreferences,
  ): Promise<RestaurantMatchResult>;
}

export const RESTAURANT_API_V1 = {
  restaurants: "/v1/restaurants",
  restaurant: "/v1/restaurants/:merchantSlug",
  globalMatch: "/v1/matches/global",
  menu: "/v1/restaurants/:merchantSlug/menus/:menuSlug",
  match: "/v1/restaurants/:merchantSlug/menus/:menuSlug/match",
  page: "/m/:merchantSlug/:menuSlug",
} as const;
