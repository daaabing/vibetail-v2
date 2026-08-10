import { z } from "zod";
import { restaurantSummarySchema } from "./restaurant.js";

const slugSchema = z.string().min(1).max(100).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const nullableUrlInputSchema = z.union([z.string().url(), z.literal(""), z.null()]).transform((value) => value || null);

export const managedMenuItemSchema = z.object({
  id: z.string().uuid(),
  menuId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2_000).nullable(),
  price: z.string().max(100).nullable(),
  imageUrl: z.string().url().nullable(),
  alcoholic: z.boolean(),
  baseSpirit: z.string().max(100).nullable(),
  flavorTags: z.array(z.string()),
  moodTags: z.array(z.string()),
  ingredients: z.array(z.string()),
  allergens: z.array(z.string()),
  recommendationPriority: z.number().int(),
  availabilityStatus: z.enum(["active", "sold_out", "hidden"]),
  section: z.string().max(200).nullable(),
  sortOrder: z.number().int(),
});
export type ManagedMenuItem = z.infer<typeof managedMenuItemSchema>;

export const managedMenuSchema = z.object({
  id: z.string().uuid(),
  slug: slugSchema,
  name: z.string().min(1).max(200),
  status: z.enum(["draft", "published", "paused"]),
  publishedVersionId: z.string().uuid().nullable(),
  shortIntro: z.string().max(1_000).nullable(),
  coverImageUrl: z.string().url().nullable(),
  items: z.array(managedMenuItemSchema),
});
export type ManagedMenu = z.infer<typeof managedMenuSchema>;

export const managedMerchantSchema = restaurantSummarySchema.extend({
  isActive: z.boolean(),
  menus: z.array(managedMenuSchema),
});
export type ManagedMerchant = z.infer<typeof managedMerchantSchema>;

export const updateMerchantInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  shortIntro: z.string().trim().max(1_000).nullable(),
  logoUrl: nullableUrlInputSchema,
  coverImageUrl: nullableUrlInputSchema,
  isActive: z.boolean(),
});
export type UpdateMerchantInput = z.infer<typeof updateMerchantInputSchema>;

export const createMenuInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: slugSchema,
  shortIntro: z.string().trim().max(1_000).nullable(),
});
export type CreateMenuInput = z.infer<typeof createMenuInputSchema>;

export const updateMenuInputSchema = createMenuInputSchema.extend({
  status: z.enum(["draft", "paused"]).optional(),
});
export type UpdateMenuInput = z.infer<typeof updateMenuInputSchema>;

export const menuItemInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2_000).nullable(),
  imageUrl: nullableUrlInputSchema,
  alcoholic: z.boolean(),
  baseSpirit: z.string().trim().max(100).nullable(),
  flavorTags: z.array(z.string().trim().min(1).max(80)).max(30),
  moodTags: z.array(z.string().trim().min(1).max(80)).max(30),
  ingredients: z.array(z.string().trim().min(1).max(200)).max(100),
  allergens: z.array(z.string().trim().min(1).max(100)).max(50),
  section: z.string().trim().max(200).nullable(),
});
export type MenuItemInput = z.infer<typeof menuItemInputSchema>;

export const updateAvailabilityInputSchema = z.object({
  availabilityStatus: z.enum(["active", "sold_out", "hidden"]),
});
export type UpdateAvailabilityInput = z.infer<typeof updateAvailabilityInputSchema>;

export interface ManagementClient {
  getManagedMerchant(): Promise<ManagedMerchant>;
  updateMerchant(input: UpdateMerchantInput): Promise<ManagedMerchant>;
  listMenus(): Promise<ManagedMenu[]>;
  createMenu(input: CreateMenuInput): Promise<ManagedMerchant>;
  updateMenu(menuId: string, input: UpdateMenuInput): Promise<ManagedMerchant>;
  publishMenu(menuId: string): Promise<ManagedMerchant>;
  createMenuItem(menuId: string, input: MenuItemInput): Promise<ManagedMerchant>;
  updateMenuItem(menuItemId: string, input: MenuItemInput): Promise<ManagedMerchant>;
  updateMenuItemAvailability(
    menuItemId: string,
    input: UpdateAvailabilityInput,
  ): Promise<ManagedMerchant>;
}

export const MANAGEMENT_API_V1 = {
  merchant: "/v1/management/merchant",
  menus: "/v1/management/menus",
  menu: "/v1/management/menus/:menuId",
  publishMenu: "/v1/management/menus/:menuId/publish",
  menuItems: "/v1/management/menus/:menuId/items",
  menuItem: "/v1/management/items/:menuItemId",
  availability: "/v1/management/items/:menuItemId/availability",
  page: "/manage/:privateToken",
} as const;
