import { z } from "zod";
import type {
  CreateMenuInput,
  MenuItemInput,
  UpdateAvailabilityInput,
  UpdateMenuInput,
  UpdateMerchantInput,
} from "@vibetail/contracts";

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
  status: z.enum(["draft", "published", "paused"]),
  publishedVersionId: z.string().uuid().nullable(),
  shortIntro: z.string().nullable(),
  coverImageUrl: nullableUrlSchema,
  fullMenuUrl: nullableUrlSchema,
  fullMenuType: z.enum(["pdf", "image"]).nullable(),
  items: z.array(storedMenuItemSchema),
});
export type StoredMenu = z.infer<typeof storedMenuSchema>;

export const storedRestaurantSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().min(1),
  shortIntro: z.string().nullable(),
  logoUrl: nullableUrlSchema,
  coverImageUrl: nullableUrlSchema,
  isActive: z.boolean(),
  menus: z.array(storedMenuSchema),
});
export type StoredRestaurant = z.infer<typeof storedRestaurantSchema>;

export const restaurantFixtureSchema = z.object({
  merchants: z.array(storedRestaurantSchema),
  matchingFailureMenuIds: z.array(z.string().uuid()).default([]),
  managementTokens: z.array(z.object({
    token: z.string().min(16),
    merchantId: z.string().uuid(),
  })).default([]),
});
export type RestaurantFixture = z.infer<typeof restaurantFixtureSchema>;

export type RestaurantMenuLookup =
  | { kind: "ok"; restaurant: StoredRestaurant; menu: StoredMenu }
  | { kind: "merchant_not_found" }
  | { kind: "merchant_inactive" }
  | { kind: "menu_not_found" }
  | { kind: "menu_unpublished" };

export type RestaurantLookup =
  | { kind: "ok"; restaurant: StoredRestaurant; menus: StoredMenu[] }
  | { kind: "merchant_not_found" }
  | { kind: "merchant_inactive" };

export interface PublishedMenuScope {
  restaurant: StoredRestaurant;
  menu: StoredMenu;
}

export interface RestaurantRepository {
  listPublishedRestaurantMenus(): Promise<PublishedMenuScope[]>;
  lookupRestaurant(merchantSlug: string): Promise<RestaurantLookup>;
  lookupMenu(merchantSlug: string, menuSlug: string): Promise<RestaurantMenuLookup>;
  getCurrentMenuItem(menuId: string, itemId: string): Promise<StoredMenuItem | null>;
}

export interface ManagementRepository {
  verifyManagementToken(token: string): Promise<string | null>;
  getManagedMerchant(merchantId: string): Promise<StoredRestaurant | null>;
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

export class RestaurantRepositoryUnavailableError extends Error {
  override readonly name = "RestaurantRepositoryUnavailableError";
}
