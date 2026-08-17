import { z } from "zod";
import { localeSchema } from "./venue.js";

const slugSchema = z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const nullableUrlInputSchema = z.union([z.string().url(), z.literal(""), z.null()]).transform((value) => value || null);

export const venueTypeSchema = z.enum(["cocktail_bar", "restaurant", "event", "other"]);
export type VenueType = z.infer<typeof venueTypeSchema>;

export const drinkStrengthSchema = z.enum(["zero", "light", "medium", "strong"]);
export type DrinkStrength = z.infer<typeof drinkStrengthSchema>;

// Legacy passwordless account-name login. Only reachable when AUTH_PROVIDER=none
// (local development); Supabase deployments reject it in favour of Google sign-in.
export const venueLoginInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
});
export type VenueLoginInput = z.infer<typeof venueLoginInputSchema>;

export const venueAccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(320),
  displayName: z.string().min(1).max(200),
  // Present once the account is backed by a verified identity provider.
  email: z.string().max(320).nullable().default(null),
});
export type VenueAccount = z.infer<typeof venueAccountSchema>;

export const venueProfileSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  name: z.string().min(1).max(200),
  address: z.string().max(500).nullable(),
  venueType: venueTypeSchema.nullable(),
  isActive: z.boolean(),
});
export type VenueProfile = z.infer<typeof venueProfileSchema>;

export const venueSessionInfoSchema = z.object({
  account: venueAccountSchema,
  venue: venueProfileSchema.nullable(),
});
export type VenueSessionInfo = z.infer<typeof venueSessionInfoSchema>;

export const venueLoginResultSchema = z.object({
  token: z.string().min(16).max(200),
  session: venueSessionInfoSchema,
});
export type VenueLoginResult = z.infer<typeof venueLoginResultSchema>;

export const createVenueInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  address: z.string().trim().min(1).max(500),
  venueType: venueTypeSchema.default("cocktail_bar"),
});
export type CreateVenueInput = z.infer<typeof createVenueInputSchema>;

export const drinkInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2_000).nullable(),
  price: z.string().trim().max(100).nullable(),
  imageUrl: nullableUrlInputSchema,
  ingredients: z.array(z.string().trim().min(1).max(200)).max(100).default([]),
  flavorTags: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  allergens: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
  baseSpirit: z.string().trim().max(100).nullable(),
  strength: drinkStrengthSchema.nullable(),
  recommendationNote: z.string().trim().max(500).nullable(),
});
export type DrinkInput = z.infer<typeof drinkInputSchema>;

export const venueDrinkSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2_000).nullable(),
  price: z.string().max(100).nullable(),
  imageUrl: z.string().url().nullable(),
  ingredients: z.array(z.string()),
  flavorTags: z.array(z.string()),
  allergens: z.array(z.string()),
  baseSpirit: z.string().max(100).nullable(),
  strength: drinkStrengthSchema.nullable(),
  recommendationNote: z.string().max(500).nullable(),
});
export type VenueDrink = z.infer<typeof venueDrinkSchema>;

export const drinkUsageSchema = z.object({
  menus: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(200),
    status: z.enum(["draft", "published", "paused", "archived"]),
  })),
});
export type DrinkUsage = z.infer<typeof drinkUsageSchema>;

export const deleteDrinkResultSchema = z.object({
  removedFromMenus: z.number().int().min(0),
});
export type DeleteDrinkResult = z.infer<typeof deleteDrinkResultSchema>;

export const drinkInfoRequestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2_000).nullable().default(null),
  ingredients: z.array(z.string().trim().min(1).max(200)).max(100).default([]),
  locale: localeSchema.default("en"),
});
export type DrinkInfoRequestInput = z.infer<typeof drinkInfoRequestSchema>;

export const drinkInfoSuggestionSchema = z.object({
  flavorTags: z.array(z.string().trim().min(1).max(80)).max(8),
  baseSpirit: z.string().trim().min(1).max(100),
  strength: drinkStrengthSchema,
  recommendationNote: z.string().trim().min(1).max(300),
});
export type DrinkInfoSuggestion = z.infer<typeof drinkInfoSuggestionSchema>;

export const venueImageContentTypeSchema = z.enum(["image/png", "image/jpeg", "image/webp"]);
export type VenueImageContentType = z.infer<typeof venueImageContentTypeSchema>;

export const menuPhotoScanInputSchema = z.object({
  imageBase64: z.string().min(1).max(12_000_000),
  imageContentType: venueImageContentTypeSchema,
  fileName: z.string().trim().min(1).max(255).optional(),
});
export type MenuPhotoScanInput = z.infer<typeof menuPhotoScanInputSchema>;

export const menuUrlScanInputSchema = z.object({
  sourceUrl: z.string().trim().url().max(2_048),
});
export type MenuUrlScanInput = z.infer<typeof menuUrlScanInputSchema>;

// Kept transform-free so model-provider Structured Outputs can compile it directly.
export const menuPhotoDrinkDraftSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2_000).nullable(),
  price: z.string().trim().max(100).nullable(),
  imageUrl: z.null(),
  ingredients: z.array(z.string().trim().min(1).max(200)).max(100),
  flavorTags: z.array(z.string().trim().min(1).max(80)).max(30),
  allergens: z.array(z.string().trim().min(1).max(100)).max(50),
  baseSpirit: z.string().trim().max(100).nullable(),
  strength: drinkStrengthSchema.nullable(),
  recommendationNote: z.string().trim().max(500).nullable(),
});
export type MenuPhotoDrinkDraft = z.infer<typeof menuPhotoDrinkDraftSchema>;

export const menuPhotoScanResultSchema = z.object({
  suggestedMenuName: z.string().trim().min(1).max(200),
  drinks: z.array(menuPhotoDrinkDraftSchema).min(1).max(100),
  provider: z.string().min(1).max(100),
});
export type MenuPhotoScanResult = z.infer<typeof menuPhotoScanResultSchema>;

export const importScannedMenuInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  drinks: z.array(drinkInputSchema).min(1).max(100),
});
export type ImportScannedMenuInput = z.infer<typeof importScannedMenuInputSchema>;

export const importScannedMenuResultSchema = z.object({
  menu: z.lazy(() => venueAdminMenuSchema),
  drinks: z.array(venueDrinkSchema),
});
export type ImportScannedMenuResult = z.infer<typeof importScannedMenuResultSchema>;

export const prepareDrinkPhotoInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2_000).nullable().default(null),
  imageBase64: z.string().min(1).max(12_000_000),
  imageContentType: venueImageContentTypeSchema,
});
export type PrepareDrinkPhotoInput = z.infer<typeof prepareDrinkPhotoInputSchema>;

export const prepareDrinkPhotoResultSchema = z.object({
  imageUrl: z.string().url(),
  backgroundRemoved: z.boolean(),
  provider: z.string().min(1).max(100),
});
export type PrepareDrinkPhotoResult = z.infer<typeof prepareDrinkPhotoResultSchema>;

export const venueAdminMenuSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  name: z.string().min(1).max(200),
  status: z.enum(["draft", "published", "paused", "archived"]),
  drinkIds: z.array(z.string().uuid()),
});
export type VenueAdminMenu = z.infer<typeof venueAdminMenuSchema>;

export const createVenueMenuInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  drinkIds: z.array(z.string().uuid()).max(200).default([]),
});
export type CreateVenueMenuInput = z.infer<typeof createVenueMenuInputSchema>;

export const updateVenueMenuInputSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  drinkIds: z.array(z.string().uuid()).max(200).optional(),
});
export type UpdateVenueMenuInput = z.infer<typeof updateVenueMenuInputSchema>;

export const venueDashboardRangeSchema = z.enum(["today", "7d", "30d"]);
export type VenueDashboardRange = z.infer<typeof venueDashboardRangeSchema>;

export const venueDashboardStatsSchema = z.object({
  range: venueDashboardRangeSchema,
  since: z.string(),
  menuViews: z.number().int().min(0),
  totalMatches: z.number().int().min(0),
  feedback: z.object({
    total: z.number().int().min(0),
    averageRating: z.number().min(1).max(5).nullable(),
  }),
  topDrinks: z.array(z.object({
    itemId: z.string().uuid(),
    name: z.string().min(1),
    matches: z.number().int().min(1),
  })).max(10),
  recentFeedback: z.array(z.object({
    id: z.string().uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(1_000).nullable(),
    drinkName: z.string().min(1),
    createdAt: z.string(),
  })).max(20),
});
export type VenueDashboardStats = z.infer<typeof venueDashboardStatsSchema>;

export const venueQrSchema = z.object({
  consumerUrl: z.string().url(),
  qrSvg: z.string().min(1),
});
export type VenueQr = z.infer<typeof venueQrSchema>;

export interface VenueManagementClient {
  login(input: VenueLoginInput): Promise<VenueLoginResult>;
  getSession(): Promise<VenueSessionInfo>;
  logout(): Promise<void>;
  createVenue(input: CreateVenueInput): Promise<VenueSessionInfo>;
  getDashboard(range: VenueDashboardRange): Promise<VenueDashboardStats>;
  getQr(): Promise<VenueQr>;
  listDrinks(): Promise<VenueDrink[]>;
  createDrink(input: DrinkInput): Promise<VenueDrink>;
  updateDrink(drinkId: string, input: DrinkInput): Promise<VenueDrink>;
  getDrinkUsage(drinkId: string): Promise<DrinkUsage>;
  deleteDrink(drinkId: string): Promise<DeleteDrinkResult>;
  suggestDrinkInfo(input: DrinkInfoRequestInput): Promise<DrinkInfoSuggestion>;
  scanMenuPhoto(input: MenuPhotoScanInput): Promise<MenuPhotoScanResult>;
  scanMenuUrl(input: MenuUrlScanInput): Promise<MenuPhotoScanResult>;
  importScannedMenu(input: ImportScannedMenuInput): Promise<ImportScannedMenuResult>;
  prepareDrinkPhoto(input: PrepareDrinkPhotoInput): Promise<PrepareDrinkPhotoResult>;
  listMenus(): Promise<VenueAdminMenu[]>;
  createMenu(input: CreateVenueMenuInput): Promise<VenueAdminMenu>;
  updateMenu(menuId: string, input: UpdateVenueMenuInput): Promise<VenueAdminMenu>;
  deleteMenu(menuId: string): Promise<void>;
  publishMenu(menuId: string): Promise<VenueAdminMenu[]>;
}

export const VENUE_MANAGEMENT_API_V1 = {
  session: "/v1/venue/session",
  venue: "/v1/venue",
  dashboard: "/v1/venue/dashboard",
  qr: "/v1/venue/qr",
  drinks: "/v1/venue/drinks",
  drink: "/v1/venue/drinks/:drinkId",
  drinkUsage: "/v1/venue/drinks/:drinkId/usage",
  drinkSuggest: "/v1/venue/drinks/suggest",
  drinkPhoto: "/v1/venue/drinks/photo",
  menus: "/v1/venue/menus",
  menuPhotoScan: "/v1/venue/menus/scan-photo",
  menuUrlScan: "/v1/venue/menus/scan-url",
  menuPhotoImport: "/v1/venue/menus/import-scan",
  menu: "/v1/venue/menus/:menuId",
  publishMenu: "/v1/venue/menus/:menuId/publish",
  currentMenu: "/v1/venues/:merchantSlug/current-menu",
  menuViews: "/v1/events/menu-views",
  feedback: "/v1/matches/:matchId/feedback",
  page: "/venue",
  consumerPage: "/m/:merchantSlug",
} as const;
