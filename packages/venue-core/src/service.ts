import { randomUUID } from "node:crypto";
import {
  globalMatchResultSchema,
  modelMatchSelectionSchema,
  venueDirectoryEntrySchema,
  venueMatchRequestSchema,
  venueMatchResultSchema,
  venueMenuItemSchema,
  venueMenuSchema,
  venuePreferencesSchema,
  venueSummarySchema,
  type GlobalMatchResult,
  type ModelMatchSelection,
  type VenueDirectoryEntry,
  type VenueError,
  type VenueErrorCode,
  type VenueMatchRequest,
  type VenueMatchResult,
  type VenueMenu,
  type VenueMenuItem,
  type VenuePreferences,
} from "@vibetail/contracts";
import type { ModelMenuCandidate, ModelProvider } from "@vibetail/model-providers";
import type {
  PublishedMenuScope,
  VenueLookup,
  VenueMenuLookup,
  VenueRepository,
  StoredMenu,
  StoredMenuItem,
  StoredVenue,
} from "./types.js";

export class VenueServiceError extends Error {
  override readonly name = "VenueServiceError";

  constructor(
    readonly detail: VenueError,
    readonly httpStatus: number,
  ) {
    super(detail.message);
  }
}

export interface VenueService {
  listActiveVenues(): Promise<VenueDirectoryEntry[]>;
  getVenue(merchantSlug: string): Promise<VenueDirectoryEntry>;
  getPublishedVenueMenu(merchantSlug: string, menuSlug: string): Promise<VenueMenu>;
  getGlobalMatchingCandidates(preferences: VenuePreferences): Promise<PublishedMenuScope[]>;
  matchGlobalItem(preferences: VenuePreferences): Promise<GlobalMatchResult>;
  matchVenueItem(input: VenueMatchRequest): Promise<VenueMatchResult>;
  validateMatchedItem(menuId: string, matchedItemId: string, traceId?: string): Promise<VenueMenuItem>;
}

export class DefaultVenueService implements VenueService {
  constructor(
    private readonly repository: VenueRepository,
    private readonly modelProvider: ModelProvider,
  ) {}

  async listActiveVenues(): Promise<VenueDirectoryEntry[]> {
    const scopes = await this.repository.listPublishedVenueMenus();
    const grouped = new Map<string, { venue: StoredVenue; menus: StoredMenu[] }>();
    for (const scope of scopes) {
      const existing = grouped.get(scope.venue.id);
      if (existing) existing.menus.push(scope.menu);
      else grouped.set(scope.venue.id, { venue: scope.venue, menus: [scope.menu] });
    }
    return [...grouped.values()].map(({ venue, menus }) => toDirectoryEntry(venue, menus));
  }

  async getVenue(merchantSlug: string): Promise<VenueDirectoryEntry> {
    const lookup = await this.repository.lookupVenue(merchantSlug);
    const { venue, menus } = unwrapVenueLookup(lookup);
    return toDirectoryEntry(venue, menus);
  }

  async getPublishedVenueMenu(merchantSlug: string, menuSlug: string): Promise<VenueMenu> {
    const lookup = await this.repository.lookupMenu(merchantSlug, menuSlug);
    const { venue, menu } = unwrapMenuLookup(lookup);
    return toPublicMenu(venue, menu);
  }

  async getGlobalMatchingCandidates(preferences: VenuePreferences): Promise<PublishedMenuScope[]> {
    const parsedPreferences = venuePreferencesSchema.parse(preferences);
    const scopes = await this.repository.listPublishedVenueMenus();
    return scopes
      .map((scope) => ({
        venue: scope.venue,
        menu: { ...scope.menu, items: scope.menu.items.filter((item) => isEligible(item, parsedPreferences)) },
      }))
      .filter((scope) => scope.menu.items.length > 0);
  }

  async matchGlobalItem(preferences: VenuePreferences): Promise<GlobalMatchResult> {
    const parsedPreferences = venuePreferencesSchema.parse(preferences);
    const scopes = await this.getGlobalMatchingCandidates(parsedPreferences);
    if (scopes.length === 0) {
      throw serviceError("GLOBAL_NO_CANDIDATES", "No currently available drinks match these preferences.", false, 409);
    }
    const narrowed = scopes
      .map((scope) => ({ ...scope, menu: { ...scope.menu, items: applySoftExclusion(scope.menu.items, parsedPreferences) } }))
      .filter((scope) => scope.menu.items.length > 0);
    const result = await this.matchFromScopes(narrowed.length > 0 ? narrowed : scopes, parsedPreferences, "global", "global");
    return globalMatchResultSchema.parse({
      ...result,
      venueSpecificUrl: `/m/${result.venue.slug}/${result.menu.slug}`,
    });
  }

  async matchVenueItem(input: VenueMatchRequest): Promise<VenueMatchResult> {
    const parsedInput = venueMatchRequestSchema.parse(input);
    const lookup = await this.repository.lookupMenu(parsedInput.merchantSlug, parsedInput.menuSlug);
    const { venue, menu } = unwrapMenuLookup(lookup);
    if (menu.items.length === 0) {
      throw serviceError("MENU_EMPTY", "This published menu does not contain any items yet.", false, 409);
    }
    const eligibleItems = menu.items.filter((item) => isEligible(item, parsedInput.preferences));
    if (eligibleItems.length === 0) {
      throw serviceError("NO_ACTIVE_ITEMS", "This menu has no items matching the current availability and preferences.", false, 409);
    }
    const remainingItems = applySoftExclusion(eligibleItems, parsedInput.preferences);
    return this.matchFromScopes(
      [{ venue, menu: { ...menu, items: remainingItems.length > 0 ? remainingItems : eligibleItems } }],
      parsedInput.preferences,
      venue.id,
      menu.id,
    );
  }

  async validateMatchedItem(menuId: string, matchedItemId: string, traceId = randomUUID()): Promise<VenueMenuItem> {
    const storedItem = await this.repository.getCurrentMenuItem(menuId, matchedItemId);
    if (!storedItem || storedItem.availabilityStatus !== "active") throw invalidSelection(traceId);
    return toPublicItem(menuId, storedItem);
  }

  private async matchFromScopes(
    scopes: PublishedMenuScope[],
    preferences: VenuePreferences,
    providerMerchantId: string,
    providerMenuId: string,
  ): Promise<VenueMatchResult> {
    const traceId = randomUUID();
    const candidates = scopes.flatMap((scope) =>
      scope.menu.items.map((item) => ({ scope, item })),
    );

    let providerResult;
    try {
      providerResult = await this.modelProvider.selectVenueItem({
        merchantId: providerMerchantId,
        menuId: providerMenuId,
        preferences,
        allowedItems: candidates.map(({ item }) => toCandidate(item)),
        traceId,
        timeoutMs: 20_000,
      });
    } catch {
      throw serviceError("MATCH_PROVIDER_UNAVAILABLE", "The matching service is temporarily unavailable.", true, 503, traceId);
    }

    const selection = modelMatchSelectionSchema.strict().safeParse(providerResult.selection);
    if (!selection.success) throw invalidSelection(traceId);
    const selectedCandidate = candidates.find(({ item }) => item.id === selection.data.matchedItemId);
    if (!selectedCandidate) throw invalidSelection(traceId);

    const currentLookup = await this.repository.lookupMenu(
      selectedCandidate.scope.venue.slug,
      selectedCandidate.scope.menu.slug,
    );
    const currentScope = unwrapMenuLookup(currentLookup, traceId);
    if (currentScope.menu.id !== selectedCandidate.scope.menu.id) throw invalidSelection(traceId);
    const item = await this.validateMatchedItem(currentScope.menu.id, selection.data.matchedItemId, traceId);
    return canonicalizeRecommendation(
      currentScope.venue,
      currentScope.menu,
      item,
      selection.data,
      traceId,
    );
  }
}

export function canonicalizeRecommendation(
  venue: StoredVenue,
  menu: StoredMenu,
  item: VenueMenuItem,
  modelCopy: ModelMatchSelection,
  traceId: string,
): VenueMatchResult {
  return venueMatchResultSchema.parse({
    venue: toVenueSummary(venue),
    menu: { id: menu.id, slug: menu.slug, name: menu.name },
    item,
    vibeName: modelCopy.vibeName,
    tastesLike: modelCopy.tastesLike,
    flavorProfile: modelCopy.flavorProfile,
    whyThisMatch: modelCopy.whyThisMatch,
    roast: modelCopy.roast,
    traceId,
  });
}

function unwrapVenueLookup(
  lookup: VenueLookup,
): { venue: StoredVenue; menus: StoredMenu[] } {
  if (lookup.kind === "ok") return lookup;
  if (lookup.kind === "merchant_inactive") {
    throw serviceError("MERCHANT_INACTIVE", "This venue is currently unavailable.", false, 404);
  }
  throw serviceError("MERCHANT_NOT_FOUND", "Venue not found.", false, 404);
}

function unwrapMenuLookup(
  lookup: VenueMenuLookup,
  traceId?: string,
): { venue: StoredVenue; menu: StoredMenu } {
  switch (lookup.kind) {
    case "ok": return lookup;
    case "merchant_not_found": throw serviceError("MERCHANT_NOT_FOUND", "Venue not found.", false, 404, traceId);
    case "merchant_inactive": throw serviceError("MERCHANT_INACTIVE", "This venue is currently unavailable.", false, 404, traceId);
    case "menu_not_found": throw serviceError("MENU_NOT_FOUND", "Menu not found.", false, 404, traceId);
    case "menu_unpublished": throw serviceError("MENU_UNPUBLISHED", "This menu is not published.", false, 404, traceId);
  }
}

function toDirectoryEntry(venue: StoredVenue, menus: StoredMenu[]): VenueDirectoryEntry {
  return venueDirectoryEntrySchema.parse({
    venue: toVenueSummary(venue),
    menus: menus.map((menu) => ({
      id: menu.id,
      slug: menu.slug,
      name: menu.name,
      shortIntro: menu.shortIntro,
      coverImageUrl: menu.coverImageUrl,
    })),
  });
}

function toPublicMenu(venue: StoredVenue, menu: StoredMenu): VenueMenu {
  return venueMenuSchema.parse({
    id: menu.id,
    slug: menu.slug,
    name: menu.name,
    status: "published",
    publishedVersionId: menu.publishedVersionId,
    shortIntro: menu.shortIntro,
    coverImageUrl: menu.coverImageUrl,
    fullMenuUrl: menu.fullMenuUrl,
    fullMenuType: menu.fullMenuType,
    venue: toVenueSummary(venue),
    items: menu.items
      .filter((item) => item.availabilityStatus !== "hidden")
      .map((item) => toPublicItem(menu.id, item)),
  });
}

function toVenueSummary(venue: StoredVenue) {
  return venueSummarySchema.parse({
    id: venue.id,
    slug: venue.slug,
    name: venue.name,
    shortIntro: venue.shortIntro,
    logoUrl: venue.logoUrl,
    coverImageUrl: venue.coverImageUrl,
  });
}

function toPublicItem(menuId: string, item: StoredMenuItem): VenueMenuItem {
  return venueMenuItemSchema.parse({ ...item, menuId });
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
    baseSpirit: item.baseSpirit,
    section: item.section,
    allergens: item.allergens,
    recommendationPriority: item.recommendationPriority,
  };
}

// Pure filter for the "match again" soft exclusion. Callers decide the
// fallback: a venue menu falls back to its own eligible items, while global
// matching falls back only when every scope has been emptied — per-scope
// fallback would sneak the excluded item back in while other venues still
// have candidates.
function applySoftExclusion<T extends { id: string }>(items: T[], preferences: VenuePreferences): T[] {
  if (preferences.excludeItemIds.length === 0) return items;
  const excluded = new Set(preferences.excludeItemIds);
  return items.filter((item) => !excluded.has(item.id));
}

function isEligible(item: StoredMenuItem, preferences: VenuePreferences): boolean {
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

function invalidSelection(traceId: string): VenueServiceError {
  return serviceError("INVALID_MATCH_SELECTION", "The provider selected an invalid or unavailable menu item.", true, 502, traceId);
}

function serviceError(
  code: VenueErrorCode,
  message: string,
  retryable: boolean,
  httpStatus: number,
  traceId?: string,
): VenueServiceError {
  return new VenueServiceError(
    { code, message, retryable, ...(traceId ? { traceId } : {}) },
    httpStatus,
  );
}
