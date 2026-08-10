import { randomUUID } from "node:crypto";
import {
  globalMatchResultSchema,
  modelMatchSelectionSchema,
  restaurantDirectoryEntrySchema,
  restaurantMatchRequestSchema,
  restaurantMatchResultSchema,
  restaurantMenuItemSchema,
  restaurantMenuSchema,
  restaurantPreferencesSchema,
  restaurantSummarySchema,
  type GlobalMatchResult,
  type RestaurantDirectoryEntry,
  type RestaurantError,
  type RestaurantErrorCode,
  type RestaurantMatchRequest,
  type RestaurantMatchResult,
  type RestaurantMenu,
  type RestaurantMenuItem,
  type RestaurantPreferences,
} from "@vibetail/contracts";
import type { ModelMenuCandidate, ModelProvider } from "@vibetail/model-providers";
import type {
  PublishedMenuScope,
  RestaurantLookup,
  RestaurantMenuLookup,
  RestaurantRepository,
  StoredMenu,
  StoredMenuItem,
  StoredRestaurant,
} from "./types.js";

export class RestaurantServiceError extends Error {
  override readonly name = "RestaurantServiceError";

  constructor(
    readonly detail: RestaurantError,
    readonly httpStatus: number,
  ) {
    super(detail.message);
  }
}

export interface RestaurantService {
  listActiveRestaurants(): Promise<RestaurantDirectoryEntry[]>;
  getRestaurant(merchantSlug: string): Promise<RestaurantDirectoryEntry>;
  getPublishedRestaurantMenu(merchantSlug: string, menuSlug: string): Promise<RestaurantMenu>;
  getGlobalMatchingCandidates(preferences: RestaurantPreferences): Promise<PublishedMenuScope[]>;
  matchGlobalItem(preferences: RestaurantPreferences): Promise<GlobalMatchResult>;
  matchRestaurantItem(input: RestaurantMatchRequest): Promise<RestaurantMatchResult>;
  validateMatchedItem(menuId: string, matchedItemId: string, traceId?: string): Promise<RestaurantMenuItem>;
}

export class DefaultRestaurantService implements RestaurantService {
  constructor(
    private readonly repository: RestaurantRepository,
    private readonly modelProvider: ModelProvider,
  ) {}

  async listActiveRestaurants(): Promise<RestaurantDirectoryEntry[]> {
    const scopes = await this.repository.listPublishedRestaurantMenus();
    const grouped = new Map<string, { restaurant: StoredRestaurant; menus: StoredMenu[] }>();
    for (const scope of scopes) {
      const existing = grouped.get(scope.restaurant.id);
      if (existing) existing.menus.push(scope.menu);
      else grouped.set(scope.restaurant.id, { restaurant: scope.restaurant, menus: [scope.menu] });
    }
    return [...grouped.values()].map(({ restaurant, menus }) => toDirectoryEntry(restaurant, menus));
  }

  async getRestaurant(merchantSlug: string): Promise<RestaurantDirectoryEntry> {
    const lookup = await this.repository.lookupRestaurant(merchantSlug);
    const { restaurant, menus } = unwrapRestaurantLookup(lookup);
    return toDirectoryEntry(restaurant, menus);
  }

  async getPublishedRestaurantMenu(merchantSlug: string, menuSlug: string): Promise<RestaurantMenu> {
    const lookup = await this.repository.lookupMenu(merchantSlug, menuSlug);
    const { restaurant, menu } = unwrapMenuLookup(lookup);
    return toPublicMenu(restaurant, menu);
  }

  async getGlobalMatchingCandidates(preferences: RestaurantPreferences): Promise<PublishedMenuScope[]> {
    const parsedPreferences = restaurantPreferencesSchema.parse(preferences);
    const scopes = await this.repository.listPublishedRestaurantMenus();
    return scopes
      .map((scope) => ({
        restaurant: scope.restaurant,
        menu: { ...scope.menu, items: scope.menu.items.filter((item) => isEligible(item, parsedPreferences)) },
      }))
      .filter((scope) => scope.menu.items.length > 0);
  }

  async matchGlobalItem(preferences: RestaurantPreferences): Promise<GlobalMatchResult> {
    const parsedPreferences = restaurantPreferencesSchema.parse(preferences);
    const scopes = await this.getGlobalMatchingCandidates(parsedPreferences);
    if (scopes.length === 0) {
      throw serviceError("GLOBAL_NO_CANDIDATES", "No currently available drinks match these preferences.", false, 409);
    }
    const result = await this.matchFromScopes(scopes, parsedPreferences, "global", "global");
    return globalMatchResultSchema.parse({
      ...result,
      restaurantSpecificUrl: `/m/${result.restaurant.slug}/${result.menu.slug}`,
    });
  }

  async matchRestaurantItem(input: RestaurantMatchRequest): Promise<RestaurantMatchResult> {
    const parsedInput = restaurantMatchRequestSchema.parse(input);
    const lookup = await this.repository.lookupMenu(parsedInput.merchantSlug, parsedInput.menuSlug);
    const { restaurant, menu } = unwrapMenuLookup(lookup);
    if (menu.items.length === 0) {
      throw serviceError("MENU_EMPTY", "This published menu does not contain any items yet.", false, 409);
    }
    const eligibleMenu = {
      ...menu,
      items: menu.items.filter((item) => isEligible(item, parsedInput.preferences)),
    };
    if (eligibleMenu.items.length === 0) {
      throw serviceError("NO_ACTIVE_ITEMS", "This menu has no items matching the current availability and preferences.", false, 409);
    }
    return this.matchFromScopes(
      [{ restaurant, menu: eligibleMenu }],
      parsedInput.preferences,
      restaurant.id,
      menu.id,
    );
  }

  async validateMatchedItem(menuId: string, matchedItemId: string, traceId = randomUUID()): Promise<RestaurantMenuItem> {
    const storedItem = await this.repository.getCurrentMenuItem(menuId, matchedItemId);
    if (!storedItem || storedItem.availabilityStatus !== "active") throw invalidSelection(traceId);
    return toPublicItem(menuId, storedItem);
  }

  private async matchFromScopes(
    scopes: PublishedMenuScope[],
    preferences: RestaurantPreferences,
    providerMerchantId: string,
    providerMenuId: string,
  ): Promise<RestaurantMatchResult> {
    const traceId = randomUUID();
    const candidates = scopes.flatMap((scope) =>
      scope.menu.items.map((item) => ({ scope, item })),
    );

    let providerResult;
    try {
      providerResult = await this.modelProvider.selectRestaurantItem({
        merchantId: providerMerchantId,
        menuId: providerMenuId,
        preferences,
        allowedItems: candidates.map(({ item }) => toCandidate(item)),
        locale: preferences.locale,
        traceId,
        timeoutMs: 8_000,
      });
    } catch {
      throw serviceError("MATCH_PROVIDER_UNAVAILABLE", "The matching service is temporarily unavailable.", true, 503, traceId);
    }

    const selection = modelMatchSelectionSchema.strict().safeParse(providerResult.selection);
    if (!selection.success) throw invalidSelection(traceId);
    const selectedCandidate = candidates.find(({ item }) => item.id === selection.data.matchedItemId);
    if (!selectedCandidate) throw invalidSelection(traceId);

    const currentLookup = await this.repository.lookupMenu(
      selectedCandidate.scope.restaurant.slug,
      selectedCandidate.scope.menu.slug,
    );
    const currentScope = unwrapMenuLookup(currentLookup, traceId);
    if (currentScope.menu.id !== selectedCandidate.scope.menu.id) throw invalidSelection(traceId);
    const item = await this.validateMatchedItem(currentScope.menu.id, selection.data.matchedItemId, traceId);
    return canonicalizeRecommendation(
      currentScope.restaurant,
      currentScope.menu,
      item,
      selection.data.whyThisMatch,
      traceId,
    );
  }
}

export function canonicalizeRecommendation(
  restaurant: StoredRestaurant,
  menu: StoredMenu,
  item: RestaurantMenuItem,
  modelExplanation: string,
  traceId: string,
): RestaurantMatchResult {
  return restaurantMatchResultSchema.parse({
    restaurant: toRestaurantSummary(restaurant),
    menu: { id: menu.id, slug: menu.slug, name: menu.name },
    item,
    whyThisMatch: modelExplanation,
    traceId,
  });
}

function unwrapRestaurantLookup(
  lookup: RestaurantLookup,
): { restaurant: StoredRestaurant; menus: StoredMenu[] } {
  if (lookup.kind === "ok") return lookup;
  if (lookup.kind === "merchant_inactive") {
    throw serviceError("MERCHANT_INACTIVE", "This restaurant is currently unavailable.", false, 404);
  }
  throw serviceError("MERCHANT_NOT_FOUND", "Restaurant not found.", false, 404);
}

function unwrapMenuLookup(
  lookup: RestaurantMenuLookup,
  traceId?: string,
): { restaurant: StoredRestaurant; menu: StoredMenu } {
  switch (lookup.kind) {
    case "ok": return lookup;
    case "merchant_not_found": throw serviceError("MERCHANT_NOT_FOUND", "Restaurant not found.", false, 404, traceId);
    case "merchant_inactive": throw serviceError("MERCHANT_INACTIVE", "This restaurant is currently unavailable.", false, 404, traceId);
    case "menu_not_found": throw serviceError("MENU_NOT_FOUND", "Menu not found.", false, 404, traceId);
    case "menu_unpublished": throw serviceError("MENU_UNPUBLISHED", "This menu is not published.", false, 404, traceId);
  }
}

function toDirectoryEntry(restaurant: StoredRestaurant, menus: StoredMenu[]): RestaurantDirectoryEntry {
  return restaurantDirectoryEntrySchema.parse({
    restaurant: toRestaurantSummary(restaurant),
    menus: menus.map((menu) => ({
      id: menu.id,
      slug: menu.slug,
      name: menu.name,
      shortIntro: menu.shortIntro,
      coverImageUrl: menu.coverImageUrl,
    })),
  });
}

function toPublicMenu(restaurant: StoredRestaurant, menu: StoredMenu): RestaurantMenu {
  return restaurantMenuSchema.parse({
    id: menu.id,
    slug: menu.slug,
    name: menu.name,
    status: "published",
    publishedVersionId: menu.publishedVersionId,
    shortIntro: menu.shortIntro,
    coverImageUrl: menu.coverImageUrl,
    fullMenuUrl: menu.fullMenuUrl,
    fullMenuType: menu.fullMenuType,
    restaurant: toRestaurantSummary(restaurant),
    items: menu.items
      .filter((item) => item.availabilityStatus !== "hidden")
      .map((item) => toPublicItem(menu.id, item)),
  });
}

function toRestaurantSummary(restaurant: StoredRestaurant) {
  return restaurantSummarySchema.parse({
    id: restaurant.id,
    slug: restaurant.slug,
    name: restaurant.name,
    shortIntro: restaurant.shortIntro,
    logoUrl: restaurant.logoUrl,
    coverImageUrl: restaurant.coverImageUrl,
  });
}

function toPublicItem(menuId: string, item: StoredMenuItem): RestaurantMenuItem {
  return restaurantMenuItemSchema.parse({ ...item, menuId });
}

function toCandidate(item: StoredMenuItem): ModelMenuCandidate {
  return {
    id: item.id,
    name: item.name,
    description: item.description,
    ingredients: item.ingredients,
    flavorTags: item.flavorTags,
    moodTags: item.moodTags,
    alcoholic: item.alcoholic,
  };
}

function isEligible(item: StoredMenuItem, preferences: RestaurantPreferences): boolean {
  if (item.availabilityStatus !== "active") return false;
  if (preferences.alcoholPreference === "alcoholic" && !item.alcoholic) return false;
  if (preferences.alcoholPreference === "non_alcoholic" && item.alcoholic) return false;
  const excludedAllergens = new Set(preferences.excludedAllergens.map(normalize));
  if (item.allergens.some((allergen) => excludedAllergens.has(normalize(allergen)))) return false;
  const excludedIngredients = preferences.excludedIngredients.map(normalize);
  return !item.ingredients.some((ingredient) =>
    excludedIngredients.some((excluded) => normalize(ingredient).includes(excluded)),
  );
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function invalidSelection(traceId: string): RestaurantServiceError {
  return serviceError("INVALID_MATCH_SELECTION", "The provider selected an invalid or unavailable menu item.", true, 502, traceId);
}

function serviceError(
  code: RestaurantErrorCode,
  message: string,
  retryable: boolean,
  httpStatus: number,
  traceId?: string,
): RestaurantServiceError {
  return new RestaurantServiceError(
    { code, message, retryable, ...(traceId ? { traceId } : {}) },
    httpStatus,
  );
}
