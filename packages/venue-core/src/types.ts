import { z } from "zod";
import {
  drinkStrengthSchema,
  type CreateMenuInput,
  type DrinkInput,
  type MenuItemInput,
  type UpdateAvailabilityInput,
  type UpdateMenuInput,
  type UpdateMerchantInput,
  type VenueType,
} from "@vibetail/contracts";
import type { VerifiedIdentity } from "./identity.js";

const nullableUrlSchema = z.string().url().nullable();

export const storedMenuItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  price: z.string().nullable(),
  imageUrl: nullableUrlSchema,
  alcoholic: z.boolean(),
  baseSpirit: z.string().nullable(),
  flavorTags: z.array(z.string()),
  moodTags: z.array(z.string()),
  ingredients: z.array(z.string()),
  allergens: z.array(z.string()),
  recommendationPriority: z.number().int(),
  availabilityStatus: z.enum(["active", "sold_out", "hidden"]),
  section: z.string().nullable(),
  sortOrder: z.number().int(),
});
export type StoredMenuItem = z.infer<typeof storedMenuItemSchema>;

export const storedMenuSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(["draft", "published", "paused", "archived"]),
  publishedVersionId: z.string().uuid().nullable(),
  shortIntro: z.string().nullable(),
  coverImageUrl: nullableUrlSchema,
  fullMenuUrl: nullableUrlSchema,
  fullMenuType: z.enum(["pdf", "image"]).nullable(),
  items: z.array(storedMenuItemSchema),
});
export type StoredMenu = z.infer<typeof storedMenuSchema>;

export const storedVenueSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  shortIntro: z.string().nullable(),
  logoUrl: nullableUrlSchema,
  coverImageUrl: nullableUrlSchema,
  isActive: z.boolean(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  menus: z.array(storedMenuSchema),
});
export type StoredVenue = z.infer<typeof storedVenueSchema>;

export const storedDrinkSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  price: z.string().nullable(),
  imageUrl: nullableUrlSchema,
  ingredients: z.array(z.string()),
  flavorTags: z.array(z.string()),
  allergens: z.array(z.string()),
  baseSpirit: z.string().nullable(),
  strength: drinkStrengthSchema.nullable(),
  recommendationNote: z.string().nullable(),
  availabilityStatus: z.enum(["active", "sold_out", "hidden"]).default("active"),
});
export type StoredDrink = z.infer<typeof storedDrinkSchema>;

export const storedVenueAccountSchema = z.object({
  id: z.string().uuid(),
  nameNormalized: z.string().min(1),
  displayName: z.string().min(1),
  merchantId: z.string().uuid().nullable(),
  // Set once the account is claimed by an identity provider (Supabase Auth).
  // Legacy name-login rows keep both fields null.
  authUserId: z.string().uuid().nullable().default(null),
  email: z.string().nullable().default(null),
});
export type StoredVenueAccount = z.infer<typeof storedVenueAccountSchema>;

export interface StoredVenueProfile {
  id: string;
  slug: string;
  name: string;
  isActive: boolean;
  address: string | null;
  venueType: VenueType | null;
}

export interface StoredVenueAdminMenu {
  id: string;
  slug: string;
  name: string;
  status: StoredMenu["status"];
  drinkIds: string[];
}

export interface StoredMatchEvent {
  id: string;
  merchantId: string;
  menuId: string | null;
  itemId: string;
  itemName: string;
  traceId: string;
  createdAt: string;
}

export interface StoredFeedbackEntry {
  id: string;
  rating: number;
  comment: string | null;
  itemName: string;
  createdAt: string;
}

export type VenueMenuLookup =
  | { kind: "ok"; venue: StoredVenue; menu: StoredMenu }
  | { kind: "merchant_not_found" }
  | { kind: "merchant_inactive" }
  | { kind: "menu_not_found" }
  | { kind: "menu_unpublished" };

export type VenueLookup =
  | { kind: "ok"; venue: StoredVenue; menus: StoredMenu[] }
  | { kind: "merchant_not_found" }
  | { kind: "merchant_inactive" };

export interface PublishedMenuScope {
  venue: StoredVenue;
  menu: StoredMenu;
}

export interface VenueRepository {
  listPublishedVenueMenus(): Promise<PublishedMenuScope[]>;
  lookupVenue(merchantSlug: string): Promise<VenueLookup>;
  lookupMenu(merchantSlug: string, menuSlug: string): Promise<VenueMenuLookup>;
  getCurrentMenuItem(menuId: string, itemId: string): Promise<StoredMenuItem | null>;
}

export interface ManagementRepository {
  verifyManagementToken(token: string): Promise<string | null>;
  getManagedMerchant(merchantId: string): Promise<StoredVenue | null>;
  updateMerchant(merchantId: string, input: UpdateMerchantInput): Promise<void>;
  createMenu(merchantId: string, input: CreateMenuInput): Promise<string>;
  updateMenu(merchantId: string, menuId: string, input: UpdateMenuInput): Promise<void>;
  publishMenu(merchantId: string, menuId: string): Promise<void>;
  createMenuItem(merchantId: string, menuId: string, input: MenuItemInput): Promise<string>;
  updateMenuItem(merchantId: string, menuItemId: string, input: MenuItemInput): Promise<void>;
  updateMenuItemAvailability(
    merchantId: string,
    menuItemId: string,
    input: UpdateAvailabilityInput,
  ): Promise<void>;
}

export interface CreateVenueRecord {
  name: string;
  slugBase: string;
  address: string;
  venueType: VenueType;
}

export interface VenueMenuRecordInput {
  name: string;
  slugBase: string;
  drinkIds: readonly string[];
}

export interface RecordMatchEventInput {
  merchantId: string;
  menuId: string | null;
  itemId: string;
  itemName: string;
  traceId: string;
  // Null for anonymous guests; consumer sign-in is optional by design.
  accountId?: string | null;
}

export type CreateFeedbackOutcome = "created" | "duplicate" | "match_not_found";

/**
 * Account-session management port for the venue backend ("manage v2").
 * All venue-scoped methods take merchantId first; ownership is enforced in
 * each adapter, mirroring ManagementRepository. Event methods are called from
 * public consumer routes and must never expose other merchants' data.
 */
export interface VenueManagementRepository {
  findOrCreateAccount(nameNormalized: string, displayName: string): Promise<StoredVenueAccount>;
  /**
   * Resolves the account behind a verified external identity, creating it on
   * first sign-in. Consumers and venue owners share one account row; owning a
   * venue is just a non-null merchantId.
   */
  findOrCreateAccountByIdentity(identity: VerifiedIdentity): Promise<StoredVenueAccount>;
  createVenueSession(accountId: string, tokenHash: string): Promise<void>;
  verifyVenueSession(tokenHash: string): Promise<StoredVenueAccount | null>;
  revokeVenueSession(tokenHash: string): Promise<void>;
  createVenue(accountId: string, input: CreateVenueRecord): Promise<string>;
  getVenueProfile(merchantId: string): Promise<StoredVenueProfile | null>;
  listDrinks(merchantId: string): Promise<StoredDrink[]>;
  createDrink(merchantId: string, input: DrinkInput): Promise<string>;
  updateDrink(merchantId: string, drinkId: string, input: DrinkInput): Promise<void>;
  deleteDrink(merchantId: string, drinkId: string): Promise<number>;
  listDrinkMenuRefs(merchantId: string, drinkId: string): Promise<StoredVenueAdminMenu[]>;
  listVenueMenus(merchantId: string): Promise<StoredVenueAdminMenu[]>;
  createVenueMenu(merchantId: string, input: VenueMenuRecordInput): Promise<string>;
  updateVenueMenu(
    merchantId: string,
    menuId: string,
    input: { name?: string; drinkIds?: readonly string[] },
  ): Promise<void>;
  deleteVenueMenu(merchantId: string, menuId: string): Promise<void>;
  publishVenueMenu(merchantId: string, menuId: string): Promise<void>;
  recordMenuView(merchantSlug: string, menuId: string | null): Promise<void>;
  recordMatchEvent(event: RecordMatchEventInput): Promise<string>;
  createFeedback(
    matchId: string,
    rating: number,
    comment: string | null,
    accountId?: string | null,
  ): Promise<CreateFeedbackOutcome>;
  countMenuViews(merchantId: string, sinceIso: string): Promise<number>;
  listMatchEvents(merchantId: string, sinceIso: string, limit: number): Promise<StoredMatchEvent[]>;
  listFeedback(merchantId: string, sinceIso: string, limit: number): Promise<StoredFeedbackEntry[]>;
}

export class VenueRepositoryUnavailableError extends Error {
  override readonly name = "VenueRepositoryUnavailableError";
}
