import { randomUUID } from "node:crypto";
import type {
  CreateMenuInput,
  MenuItemInput,
  UpdateAvailabilityInput,
  UpdateMenuInput,
  UpdateMerchantInput,
} from "@vibetail/contracts";
import rawFixture from "../../../../fixtures/restaurant/menus.json";
import {
  restaurantFixtureSchema,
  type ManagementRepository,
  type PublishedMenuScope,
  type RestaurantFixture,
  type RestaurantLookup,
  type RestaurantMenuLookup,
  type RestaurantRepository,
  type StoredMenu,
  type StoredMenuItem,
  type StoredRestaurant,
} from "../types.js";

export class FixtureRestaurantRepository implements RestaurantRepository, ManagementRepository {
  readonly fixture: RestaurantFixture;

  constructor(fixture: unknown = rawFixture) {
    this.fixture = restaurantFixtureSchema.parse(fixture);
  }

  async listPublishedRestaurantMenus(): Promise<PublishedMenuScope[]> {
    return this.fixture.merchants.flatMap((restaurant) => {
      if (!restaurant.isActive) return [];
      return restaurant.menus
        .filter(isPublished)
        .map((menu) => ({ restaurant, menu }));
    });
  }

  async lookupRestaurant(merchantSlug: string): Promise<RestaurantLookup> {
    const restaurant = this.fixture.merchants.find((entry) => entry.slug === merchantSlug);
    if (!restaurant) return { kind: "merchant_not_found" };
    if (!restaurant.isActive) return { kind: "merchant_inactive" };
    return { kind: "ok", restaurant, menus: restaurant.menus.filter(isPublished) };
  }

  async lookupMenu(merchantSlug: string, menuSlug: string): Promise<RestaurantMenuLookup> {
    const restaurant = this.fixture.merchants.find((entry) => entry.slug === merchantSlug);
    if (!restaurant) return { kind: "merchant_not_found" };
    if (!restaurant.isActive) return { kind: "merchant_inactive" };

    const menu = restaurant.menus.find((entry) => entry.slug === menuSlug);
    if (!menu) return { kind: "menu_not_found" };
    if (!isPublished(menu)) return { kind: "menu_unpublished" };
    return { kind: "ok", restaurant, menu };
  }

  async getCurrentMenuItem(menuId: string, itemId: string): Promise<StoredMenuItem | null> {
    for (const restaurant of this.fixture.merchants) {
      if (!restaurant.isActive) continue;
      const menu = restaurant.menus.find((entry) => entry.id === menuId);
      if (!menu || !isPublished(menu)) continue;
      const item = menu.items.find((entry) => entry.id === itemId);
      if (item) return item;
    }
    return null;
  }

  async verifyManagementToken(token: string): Promise<string | null> {
    return this.fixture.managementTokens.find((entry) => constantTimeEqual(entry.token, token))?.merchantId ?? null;
  }

  async getManagedMerchant(merchantId: string): Promise<StoredRestaurant | null> {
    return this.fixture.merchants.find((entry) => entry.id === merchantId) ?? null;
  }

  async updateMerchant(merchantId: string, input: UpdateMerchantInput): Promise<void> {
    const merchant = this.requireMerchant(merchantId);
    merchant.name = input.name;
    merchant.shortIntro = input.shortIntro;
    merchant.logoUrl = input.logoUrl;
    merchant.coverImageUrl = input.coverImageUrl;
    merchant.isActive = input.isActive;
  }

  async createMenu(merchantId: string, input: CreateMenuInput): Promise<string> {
    const merchant = this.requireMerchant(merchantId);
    if (merchant.menus.some((menu) => menu.slug === input.slug)) throw new Error("Menu slug already exists");
    const id = randomUUID();
    merchant.menus.unshift({
      id,
      slug: input.slug,
      name: input.name,
      status: "draft",
      publishedVersionId: null,
      shortIntro: input.shortIntro,
      coverImageUrl: null,
      fullMenuUrl: null,
      fullMenuType: null,
      items: [],
    });
    return id;
  }

  async updateMenu(merchantId: string, menuId: string, input: UpdateMenuInput): Promise<void> {
    const { restaurant, menu } = this.requireMenu(merchantId, menuId);
    if (restaurant.menus.some((entry) => entry.id !== menuId && entry.slug === input.slug)) {
      throw new Error("Menu slug already exists");
    }
    menu.name = input.name;
    menu.slug = input.slug;
    menu.shortIntro = input.shortIntro;
    if (input.status) menu.status = input.status;
  }

  async publishMenu(merchantId: string, menuId: string): Promise<void> {
    const { menu } = this.requireMenu(merchantId, menuId);
    if (!menu.items.some((item) => item.availabilityStatus === "active")) {
      throw new Error("Add at least one active item before publishing");
    }
    menu.status = "published";
    menu.publishedVersionId = randomUUID();
  }

  async createMenuItem(merchantId: string, menuId: string, input: MenuItemInput): Promise<string> {
    const { menu } = this.requireMenu(merchantId, menuId);
    const id = randomUUID();
    const sortOrder = Math.max(0, ...menu.items.map((item) => item.sortOrder)) + 10;
    menu.items.push(toStoredItem(id, input, sortOrder));
    return id;
  }

  async updateMenuItem(merchantId: string, menuItemId: string, input: MenuItemInput): Promise<void> {
    const item = this.requireItem(merchantId, menuItemId);
    Object.assign(item, {
      name: input.name,
      description: input.description,
      imageUrl: input.imageUrl,
      alcoholic: input.alcoholic,
      baseSpirit: input.baseSpirit,
      flavorTags: [...input.flavorTags],
      moodTags: [...input.moodTags],
      ingredients: [...input.ingredients],
      allergens: [...input.allergens],
      section: input.section,
    });
  }

  async updateMenuItemAvailability(
    merchantId: string,
    menuItemId: string,
    input: UpdateAvailabilityInput,
  ): Promise<void> {
    this.requireItem(merchantId, menuItemId).availabilityStatus = input.availabilityStatus;
  }

  private requireMerchant(merchantId: string): StoredRestaurant {
    const merchant = this.fixture.merchants.find((entry) => entry.id === merchantId);
    if (!merchant) throw new Error("Merchant not found");
    return merchant;
  }

  private requireMenu(merchantId: string, menuId: string): { restaurant: StoredRestaurant; menu: StoredMenu } {
    const restaurant = this.requireMerchant(merchantId);
    const menu = restaurant.menus.find((entry) => entry.id === menuId);
    if (!menu) throw new Error("Menu not found or forbidden");
    return { restaurant, menu };
  }

  private requireItem(merchantId: string, menuItemId: string): StoredMenuItem {
    const merchant = this.requireMerchant(merchantId);
    for (const menu of merchant.menus) {
      const item = menu.items.find((entry) => entry.id === menuItemId);
      if (item) return item;
    }
    throw new Error("Menu item not found or forbidden");
  }
}

function isPublished(menu: StoredMenu): boolean {
  return menu.status === "published" && Boolean(menu.publishedVersionId);
}

function toStoredItem(id: string, input: MenuItemInput, sortOrder: number): StoredMenuItem {
  return {
    id,
    name: input.name,
    description: input.description,
    price: null,
    imageUrl: input.imageUrl,
    alcoholic: input.alcoholic,
    baseSpirit: input.baseSpirit,
    flavorTags: [...input.flavorTags],
    moodTags: [...input.moodTags],
    ingredients: [...input.ingredients],
    allergens: [...input.allergens],
    recommendationPriority: 0,
    availabilityStatus: "active",
    section: input.section,
    sortOrder,
  };
}

function constantTimeEqual(left: string, right: string): boolean {
  const size = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < size; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}
