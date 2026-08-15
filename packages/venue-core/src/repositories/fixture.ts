import { randomUUID } from "node:crypto";
import type {
  CreateMenuInput,
  DrinkInput,
  MenuItemInput,
  UpdateAvailabilityInput,
  UpdateMenuInput,
  UpdateMerchantInput,
  VenueType,
} from "@vibetail/contracts";
import rawFixture from "../../../../fixtures/venue/menus.json";
import {
  venueFixtureSchema,
  type CreateFeedbackOutcome,
  type CreateVenueRecord,
  type ManagementRepository,
  type PublishedMenuScope,
  type RecordMatchEventInput,
  type StoredDrink,
  type StoredFeedbackEntry,
  type StoredMatchEvent,
  type StoredMenu,
  type StoredMenuItem,
  type StoredVenue,
  type StoredVenueAccount,
  type StoredVenueAdminMenu,
  type StoredVenueProfile,
  type VenueFixture,
  type VenueLookup,
  type VenueManagementRepository,
  type VenueMenuLookup,
  type VenueMenuRecordInput,
  type VenueRepository,
} from "../types.js";

interface StoredFeedbackRecord extends StoredFeedbackEntry {
  matchId: string;
  merchantId: string;
}

export class FixtureVenueRepository implements VenueRepository, ManagementRepository, VenueManagementRepository {
  readonly fixture: VenueFixture;
  private readonly accounts: StoredVenueAccount[];
  private readonly profiles = new Map<string, { address: string | null; venueType: VenueType | null }>();
  private readonly drinksById = new Map<string, { merchantId: string; drink: StoredDrink }>();
  private menuDrinks: Array<{ menuId: string; drinkId: string; sortOrder: number }>;
  private readonly sessions = new Map<string, string>();
  private readonly matchEvents: Array<StoredMatchEvent & { merchantId: string }> = [];
  private readonly menuViews: Array<{ merchantId: string; menuId: string | null; createdAt: string }> = [];
  private readonly feedbackRecords: StoredFeedbackRecord[] = [];

  constructor(fixture: unknown = rawFixture) {
    this.fixture = venueFixtureSchema.parse(fixture);
    const seed = this.fixture.venues;
    this.accounts = seed.accounts;
    for (const profile of seed.profiles) {
      this.profiles.set(profile.merchantId, { address: profile.address, venueType: profile.venueType });
    }
    for (const entry of seed.drinks) {
      this.drinksById.set(entry.drink.id, { merchantId: entry.merchantId, drink: entry.drink });
    }
    this.menuDrinks = [...seed.menuDrinks];
    const now = Date.now();
    for (const event of seed.matchEvents) {
      this.matchEvents.push({
        id: event.id,
        merchantId: event.merchantId,
        menuId: event.menuId,
        itemId: event.itemId,
        itemName: event.itemName,
        traceId: event.traceId,
        createdAt: new Date(now - event.minutesAgo * 60_000).toISOString(),
      });
    }
    for (const view of seed.menuViews) {
      this.menuViews.push({
        merchantId: view.merchantId,
        menuId: view.menuId,
        createdAt: new Date(now - view.minutesAgo * 60_000).toISOString(),
      });
    }
    for (const entry of seed.feedback) {
      const match = this.matchEvents.find((event) => event.id === entry.matchId);
      if (!match) continue;
      this.feedbackRecords.push({
        id: entry.id,
        matchId: entry.matchId,
        merchantId: match.merchantId,
        rating: entry.rating,
        comment: entry.comment,
        itemName: match.itemName,
        createdAt: new Date(now - entry.minutesAgo * 60_000).toISOString(),
      });
    }
    for (const merchant of this.fixture.merchants) {
      for (const menu of merchant.menus) {
        if (this.menuDrinks.some((ref) => ref.menuId === menu.id)) {
          this.deriveMenuItems(menu);
        }
      }
    }
  }

  async listPublishedVenueMenus(): Promise<PublishedMenuScope[]> {
    return this.fixture.merchants.flatMap((venue) => {
      if (!venue.isActive) return [];
      return venue.menus
        .filter(isPublished)
        .map((menu) => ({ venue, menu }));
    });
  }

  async lookupVenue(merchantSlug: string): Promise<VenueLookup> {
    const venue = this.fixture.merchants.find((entry) => entry.slug === merchantSlug);
    if (!venue) return { kind: "merchant_not_found" };
    if (!venue.isActive) return { kind: "merchant_inactive" };
    return { kind: "ok", venue, menus: venue.menus.filter(isPublished) };
  }

  async lookupMenu(merchantSlug: string, menuSlug: string): Promise<VenueMenuLookup> {
    const venue = this.fixture.merchants.find((entry) => entry.slug === merchantSlug);
    if (!venue) return { kind: "merchant_not_found" };
    if (!venue.isActive) return { kind: "merchant_inactive" };

    const menu = venue.menus.find((entry) => entry.slug === menuSlug);
    if (!menu) return { kind: "menu_not_found" };
    if (!isPublished(menu)) return { kind: "menu_unpublished" };
    return { kind: "ok", venue, menu };
  }

  async getCurrentMenuItem(menuId: string, itemId: string): Promise<StoredMenuItem | null> {
    for (const venue of this.fixture.merchants) {
      if (!venue.isActive) continue;
      const menu = venue.menus.find((entry) => entry.id === menuId);
      if (!menu || !isPublished(menu)) continue;
      const item = menu.items.find((entry) => entry.id === itemId);
      if (item) return item;
    }
    return null;
  }

  async verifyManagementToken(token: string): Promise<string | null> {
    return this.fixture.managementTokens.find((entry) => constantTimeEqual(entry.token, token))?.merchantId ?? null;
  }

  async getManagedMerchant(merchantId: string): Promise<StoredVenue | null> {
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
    const { venue, menu } = this.requireMenu(merchantId, menuId);
    if (venue.menus.some((entry) => entry.id !== menuId && entry.slug === input.slug)) {
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

  async findOrCreateAccount(nameNormalized: string, displayName: string): Promise<StoredVenueAccount> {
    const existing = this.accounts.find((entry) => entry.nameNormalized === nameNormalized);
    if (existing) return existing;
    const account: StoredVenueAccount = {
      id: randomUUID(),
      nameNormalized,
      displayName,
      merchantId: null,
    };
    this.accounts.push(account);
    return account;
  }

  async createVenueSession(accountId: string, tokenHash: string): Promise<void> {
    this.sessions.set(tokenHash, accountId);
  }

  async verifyVenueSession(tokenHash: string): Promise<StoredVenueAccount | null> {
    const accountId = this.sessions.get(tokenHash);
    if (!accountId) return null;
    return this.accounts.find((entry) => entry.id === accountId) ?? null;
  }

  async revokeVenueSession(tokenHash: string): Promise<void> {
    this.sessions.delete(tokenHash);
  }

  async createVenue(accountId: string, input: CreateVenueRecord): Promise<string> {
    const account = this.accounts.find((entry) => entry.id === accountId);
    if (!account) throw new Error("Account not found");
    if (account.merchantId) throw new Error("Venue already exists");
    const slug = this.uniqueMerchantSlug(input.slugBase);
    const merchantId = randomUUID();
    this.fixture.merchants.push({
      id: merchantId,
      slug,
      name: input.name,
      shortIntro: null,
      logoUrl: null,
      coverImageUrl: null,
      isActive: true,
      menus: [],
    });
    this.profiles.set(merchantId, { address: input.address, venueType: input.venueType });
    account.merchantId = merchantId;
    return merchantId;
  }

  async getVenueProfile(merchantId: string): Promise<StoredVenueProfile | null> {
    const merchant = this.fixture.merchants.find((entry) => entry.id === merchantId);
    if (!merchant) return null;
    const profile = this.profiles.get(merchantId);
    return {
      id: merchant.id,
      slug: merchant.slug,
      name: merchant.name,
      isActive: merchant.isActive,
      address: profile?.address ?? null,
      venueType: profile?.venueType ?? null,
    };
  }

  async listDrinks(merchantId: string): Promise<StoredDrink[]> {
    return [...this.drinksById.values()]
      .filter((entry) => entry.merchantId === merchantId)
      .map((entry) => entry.drink);
  }

  async createDrink(merchantId: string, input: DrinkInput): Promise<string> {
    this.requireMerchant(merchantId);
    const drink = toStoredDrink(randomUUID(), input);
    this.drinksById.set(drink.id, { merchantId, drink });
    return drink.id;
  }

  async updateDrink(merchantId: string, drinkId: string, input: DrinkInput): Promise<void> {
    const drink = this.requireDrink(merchantId, drinkId);
    Object.assign(drink, toStoredDrink(drinkId, input, drink.availabilityStatus));
    this.rederiveMenusReferencing(drinkId);
  }

  async deleteDrink(merchantId: string, drinkId: string): Promise<number> {
    this.requireDrink(merchantId, drinkId);
    const affectedMenuIds = new Set(
      this.menuDrinks.filter((ref) => ref.drinkId === drinkId).map((ref) => ref.menuId),
    );
    this.drinksById.delete(drinkId);
    this.menuDrinks = this.menuDrinks.filter((ref) => ref.drinkId !== drinkId);
    for (const menuId of affectedMenuIds) {
      const menu = this.findMenuById(menuId);
      if (menu) this.deriveMenuItems(menu);
    }
    return affectedMenuIds.size;
  }

  async listDrinkMenuRefs(merchantId: string, drinkId: string): Promise<StoredVenueAdminMenu[]> {
    this.requireDrink(merchantId, drinkId);
    const menuIds = new Set(
      this.menuDrinks.filter((ref) => ref.drinkId === drinkId).map((ref) => ref.menuId),
    );
    return (await this.listVenueMenus(merchantId)).filter((menu) => menuIds.has(menu.id));
  }

  async listVenueMenus(merchantId: string): Promise<StoredVenueAdminMenu[]> {
    const merchant = this.requireMerchant(merchantId);
    return merchant.menus.map((menu) => ({
      id: menu.id,
      slug: menu.slug,
      name: menu.name,
      status: menu.status,
      drinkIds: this.menuDrinks
        .filter((ref) => ref.menuId === menu.id)
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((ref) => ref.drinkId),
    }));
  }

  async createVenueMenu(merchantId: string, input: VenueMenuRecordInput): Promise<string> {
    const merchant = this.requireMerchant(merchantId);
    this.requireOwnDrinks(merchantId, input.drinkIds);
    const slug = uniqueSlugWithin(merchant.menus.map((menu) => menu.slug), input.slugBase);
    const menu: StoredMenu = {
      id: randomUUID(),
      slug,
      name: input.name,
      status: "draft",
      publishedVersionId: null,
      shortIntro: null,
      coverImageUrl: null,
      fullMenuUrl: null,
      fullMenuType: null,
      items: [],
    };
    merchant.menus.unshift(menu);
    this.replaceMenuDrinks(menu.id, input.drinkIds);
    this.deriveMenuItems(menu);
    return menu.id;
  }

  async updateVenueMenu(
    merchantId: string,
    menuId: string,
    input: { name?: string; drinkIds?: readonly string[] },
  ): Promise<void> {
    const { menu } = this.requireMenu(merchantId, menuId);
    if (input.name !== undefined) menu.name = input.name;
    if (input.drinkIds !== undefined) {
      this.requireOwnDrinks(merchantId, input.drinkIds);
      this.replaceMenuDrinks(menuId, input.drinkIds);
      this.deriveMenuItems(menu);
    }
  }

  async deleteVenueMenu(merchantId: string, menuId: string): Promise<void> {
    const { venue } = this.requireMenu(merchantId, menuId);
    venue.menus = venue.menus.filter((entry) => entry.id !== menuId);
    this.menuDrinks = this.menuDrinks.filter((ref) => ref.menuId !== menuId);
  }

  async publishVenueMenu(merchantId: string, menuId: string): Promise<void> {
    const { venue, menu } = this.requireMenu(merchantId, menuId);
    if (!menu.items.some((item) => item.availabilityStatus === "active")) {
      throw new Error("Add at least one active drink before publishing");
    }
    for (const other of venue.menus) {
      if (other.id !== menuId && other.status === "published") {
        other.status = "archived";
      }
    }
    menu.status = "published";
    menu.publishedVersionId = randomUUID();
  }

  async recordMenuView(merchantSlug: string, menuId: string | null): Promise<void> {
    const merchant = this.fixture.merchants.find((entry) => entry.slug === merchantSlug);
    if (!merchant) return;
    this.menuViews.push({ merchantId: merchant.id, menuId, createdAt: new Date().toISOString() });
  }

  async recordMatchEvent(event: RecordMatchEventInput): Promise<string> {
    const id = randomUUID();
    this.matchEvents.push({
      id,
      merchantId: event.merchantId,
      menuId: event.menuId,
      itemId: event.itemId,
      itemName: event.itemName,
      traceId: event.traceId,
      createdAt: new Date().toISOString(),
    });
    return id;
  }

  async createFeedback(matchId: string, rating: number, comment: string | null): Promise<CreateFeedbackOutcome> {
    const match = this.matchEvents.find((event) => event.id === matchId);
    if (!match) return "match_not_found";
    if (this.feedbackRecords.some((entry) => entry.matchId === matchId)) return "duplicate";
    this.feedbackRecords.push({
      id: randomUUID(),
      matchId,
      merchantId: match.merchantId,
      rating,
      comment,
      itemName: match.itemName,
      createdAt: new Date().toISOString(),
    });
    return "created";
  }

  async countMenuViews(merchantId: string, sinceIso: string): Promise<number> {
    return this.menuViews.filter((view) => view.merchantId === merchantId && view.createdAt >= sinceIso).length;
  }

  async listMatchEvents(merchantId: string, sinceIso: string, limit: number): Promise<StoredMatchEvent[]> {
    return this.matchEvents
      .filter((event) => event.merchantId === merchantId && event.createdAt >= sinceIso)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit);
  }

  async listFeedback(merchantId: string, sinceIso: string, limit: number): Promise<StoredFeedbackEntry[]> {
    return this.feedbackRecords
      .filter((entry) => entry.merchantId === merchantId && entry.createdAt >= sinceIso)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, limit)
      .map((entry) => ({
        id: entry.id,
        rating: entry.rating,
        comment: entry.comment,
        itemName: entry.itemName,
        createdAt: entry.createdAt,
      }));
  }

  private deriveMenuItems(menu: StoredMenu): void {
    menu.items = this.menuDrinks
      .filter((ref) => ref.menuId === menu.id)
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .flatMap((ref) => {
        const entry = this.drinksById.get(ref.drinkId);
        return entry ? [drinkToStoredItem(entry.drink, ref.sortOrder)] : [];
      });
  }

  private rederiveMenusReferencing(drinkId: string): void {
    const menuIds = new Set(
      this.menuDrinks.filter((ref) => ref.drinkId === drinkId).map((ref) => ref.menuId),
    );
    for (const menuId of menuIds) {
      const menu = this.findMenuById(menuId);
      if (menu) this.deriveMenuItems(menu);
    }
  }

  private replaceMenuDrinks(menuId: string, drinkIds: readonly string[]): void {
    this.menuDrinks = this.menuDrinks.filter((ref) => ref.menuId !== menuId);
    drinkIds.forEach((drinkId, index) => {
      this.menuDrinks.push({ menuId, drinkId, sortOrder: (index + 1) * 10 });
    });
  }

  private requireOwnDrinks(merchantId: string, drinkIds: readonly string[]): void {
    for (const drinkId of drinkIds) {
      const entry = this.drinksById.get(drinkId);
      if (!entry || entry.merchantId !== merchantId) throw new Error("Menu references an unknown drink");
    }
  }

  private requireDrink(merchantId: string, drinkId: string): StoredDrink {
    const entry = this.drinksById.get(drinkId);
    if (!entry || entry.merchantId !== merchantId) throw new Error("Drink not found or forbidden");
    return entry.drink;
  }

  private findMenuById(menuId: string): StoredMenu | null {
    for (const merchant of this.fixture.merchants) {
      const menu = merchant.menus.find((entry) => entry.id === menuId);
      if (menu) return menu;
    }
    return null;
  }

  private uniqueMerchantSlug(slugBase: string): string {
    return uniqueSlugWithin(this.fixture.merchants.map((merchant) => merchant.slug), slugBase);
  }

  private requireMerchant(merchantId: string): StoredVenue {
    const merchant = this.fixture.merchants.find((entry) => entry.id === merchantId);
    if (!merchant) throw new Error("Merchant not found");
    return merchant;
  }

  private requireMenu(merchantId: string, menuId: string): { venue: StoredVenue; menu: StoredMenu } {
    const venue = this.requireMerchant(merchantId);
    const menu = venue.menus.find((entry) => entry.id === menuId);
    if (!menu) throw new Error("Menu not found or forbidden");
    return { venue, menu };
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

function toStoredDrink(
  id: string,
  input: DrinkInput,
  availabilityStatus: StoredDrink["availabilityStatus"] = "active",
): StoredDrink {
  return {
    id,
    name: input.name,
    description: input.description,
    price: input.price,
    imageUrl: input.imageUrl,
    ingredients: [...input.ingredients],
    flavorTags: [...input.flavorTags],
    allergens: [...input.allergens],
    baseSpirit: input.baseSpirit,
    strength: input.strength,
    recommendationNote: input.recommendationNote,
    availabilityStatus,
  };
}

// A drink without a known strength defaults to alcoholic so it can never be
// recommended to a guest who asked for non-alcoholic options.
function drinkToStoredItem(drink: StoredDrink, sortOrder: number): StoredMenuItem {
  return {
    id: drink.id,
    name: drink.name,
    description: drink.description,
    price: drink.price,
    imageUrl: drink.imageUrl,
    alcoholic: drink.strength !== "zero",
    baseSpirit: drink.baseSpirit,
    flavorTags: [...drink.flavorTags],
    moodTags: [],
    ingredients: [...drink.ingredients],
    allergens: [...drink.allergens],
    recommendationPriority: 0,
    availabilityStatus: drink.availabilityStatus,
    section: null,
    sortOrder,
  };
}

function uniqueSlugWithin(existing: readonly string[], slugBase: string): string {
  const taken = new Set(existing);
  if (!taken.has(slugBase)) return slugBase;
  for (let suffix = 2; suffix < 1_000; suffix += 1) {
    const candidate = `${slugBase}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error("Slug already exists");
}

function constantTimeEqual(left: string, right: string): boolean {
  const size = Math.max(left.length, right.length);
  let mismatch = left.length ^ right.length;
  for (let index = 0; index < size; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}
