/**
 * Runs against the local Supabase stack (reset + seeded once per vitest run by
 * test/global-db-setup.ts). Seeded fixture data is used for read-only
 * assertions only; every test that writes creates its own merchant under an
 * "svc-test-*" name so this file cannot pollute (or be polluted by) other
 * test files sharing the same database reset.
 */
import type { VenueMatchRequest } from "@vibetail/contracts";
import { DeterministicMatchingProvider, type ModelProvider, type VenueModelRequest } from "@vibetail/model-providers";
import { describe, expect, it, vi } from "vitest";
import { DefaultManagementService, UnavailableManagementService } from "../src/management-service.js";
import { DefaultVenueService, VenueServiceError } from "../src/service.js";
import {
  anonVenueRepository,
  createLegacyMerchantContext,
  managementRepository,
  uniqueName,
  venueManagementRepository,
} from "./helpers.js";

const request: VenueMatchRequest = {
  merchantSlug: "double-chicken-please",
  menuSlug: "main",
  preferences: {
    mood: "adventurous",
    flavors: ["spicy"],
    alcoholPreference: "either",
    excludedAllergens: [],
    excludedIngredients: [],
  },
};

describe("DefaultVenueService", () => {
  it("lists active venues with published menus and excludes inactive merchants", async () => {
    // Other test files may add their own venues to the shared database, so the
    // seeded venues are asserted individually instead of as the exact directory.
    const directory = await venueService().listActiveVenues();
    const menusByVenue = new Map(
      directory.map((entry) => [entry.venue.slug, entry.menus.map((menu) => menu.slug)]),
    );
    expect(menusByVenue.get("double-chicken-please")).toEqual(["main"]);
    expect(menusByVenue.get("nightjar-demo")).toEqual(["cocktails"]);
    expect(menusByVenue.get("vibetail-taproom")).toEqual(["signature"]);
    expect(menusByVenue.has("inactive-venue")).toBe(false);
    expect(menusByVenue.get("double-chicken-please")).not.toContain("unpublished");
  });

  it("globally matches a canonical merchant, menu and active item with a deep link", async () => {
    const provider = fixedProvider("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", "Bright, botanical and zero proof.");
    const result = await new DefaultVenueService(anonVenueRepository(), provider).matchGlobalItem({
      mood: "clear headed", flavors: ["fresh"], alcoholPreference: "non_alcoholic",
      excludedAllergens: [], excludedIngredients: [],
    });
    expect(result).toMatchObject({
      venue: { slug: "nightjar-demo" }, menu: { slug: "cocktails" },
      item: { name: "Neon Garden", availabilityStatus: "active" },
      venueSpecificUrl: "/m/nightjar-demo/cocktails",
    });
  });

  it("never sends inactive merchants, unpublished menus, sold-out or hidden items to global matching", async () => {
    const selectVenueItem = vi.fn(async (modelRequest: VenueModelRequest) => ({
      selection: modelSelection(modelRequest.allowedItems[0]!.id, "Valid."),
      metadata: { provider: "spy", model: "spy", attempt: 1, durationMs: 0 },
    }));
    const service = new DefaultVenueService(anonVenueRepository(), { id: "spy", selectVenueItem });
    await service.matchGlobalItem(request.preferences);
    const ids = selectVenueItem.mock.calls[0]![0].allowedItems.map((item) => item.id);
    expect(ids).not.toContain("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3");
    expect(ids).not.toContain("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4");
  });

  it("fails closed when a global provider returns an ID outside the candidate allowlist", async () => {
    await expect(new DefaultVenueService(anonVenueRepository(), fixedProvider(
      "99999999-9999-4999-8999-999999999999", "Invented.",
    )).matchGlobalItem(request.preferences)).rejects.toMatchObject({ detail: { code: "INVALID_MATCH_SELECTION" } });
  });

  it("loads only the active merchant's published menu and hides hidden items", async () => {
    const service = venueService();
    const menu = await service.getPublishedVenueMenu("double-chicken-please", "main");
    expect(menu.venue.name).toBe("Double Chicken Please");
    expect(menu.items.map((item) => item.name)).toEqual(["Holy Shishito", "Cuppa Sunshine", "Waldorf Salad"]);
    expect(menu.items.map((item) => item.name)).not.toContain("Hidden Test Drink");
  });

  it.each([
    ["missing", "main", "MERCHANT_NOT_FOUND"],
    // Anon RLS hides inactive merchants entirely, so the public surface cannot
    // distinguish "inactive" from "missing" (fixture mode reported
    // MERCHANT_INACTIVE; that code is unreachable through the publishable key).
    ["inactive-venue", "main", "MERCHANT_NOT_FOUND"],
    ["double-chicken-please", "missing", "MENU_NOT_FOUND"],
    // Anon RLS hides draft menus, so an unpublished menu reads as missing
    // (fixture mode reported MENU_UNPUBLISHED).
    ["double-chicken-please", "unpublished", "MENU_NOT_FOUND"],
  ])("returns a precise unavailable state for %s/%s", async (merchantSlug, menuSlug, code) => {
    await expect(venueService().getPublishedVenueMenu(merchantSlug, menuSlug))
      .rejects.toMatchObject({ detail: { code } });
  });

  it("distinguishes an empty menu from a menu with no active items", async () => {
    // Empty published menu: the live publish flows refuse zero active items,
    // so publish a drink-backed menu first and then delete its only drink
    // (menu_drinks cascades away while the menu row stays published).
    const repository = venueManagementRepository();
    const emptyName = uniqueName("svc-test-empty");
    const account = await repository.findOrCreateAccount(emptyName, emptyName);
    const merchantId = await repository.createVenue(account.id, {
      name: emptyName,
      slugBase: emptyName,
      shortIntro: null,
      address: "1 Test Street",
      venueType: "cocktail_bar",
    });
    const drinkId = await repository.createDrink(merchantId, {
      name: "Disposable Drink",
      description: null,
      price: null,
      imageUrl: null,
      ingredients: ["water"],
      flavorTags: ["fresh"],
      allergens: [],
      baseSpirit: null,
      strength: "zero",
      recommendationNote: null,
    });
    const menuId = await repository.createVenueMenu(merchantId, {
      name: "Empty Case",
      slugBase: "empty-case",
      drinkIds: [drinkId],
    });
    await repository.publishVenueMenu(merchantId, menuId);
    await repository.deleteDrink(merchantId, drinkId);
    const profile = await repository.getVenueProfile(merchantId);
    await expect(venueService().matchVenueItem({
      ...request,
      merchantSlug: profile!.slug,
      menuSlug: "empty-case",
    })).rejects.toMatchObject({ detail: { code: "MENU_EMPTY" } });

    // No active items: item availability is only editable through the legacy
    // management flow, so build the all-sold-out state there.
    const legacy = await createLegacyMerchantContext("svc-test-soldout");
    const management = new DefaultManagementService(managementRepository());
    let merchant = await management.createMenu(legacy.token, {
      name: "Sold Out Case", slug: "sold-out-case", shortIntro: null,
    });
    const menu = merchant.menus.find((entry) => entry.slug === "sold-out-case")!;
    merchant = await management.createMenuItem(legacy.token, menu.id, {
      name: "Gone Already", description: "Sold out after publishing.", imageUrl: null,
      alcoholic: true, baseSpirit: "rye", flavorTags: ["spiced"], moodTags: ["nostalgic"],
      ingredients: ["rye", "pear"], allergens: [], section: null,
    });
    const itemId = merchant.menus.find((entry) => entry.id === menu.id)!.items[0]!.id;
    await management.publishMenu(legacy.token, menu.id);
    await management.updateMenuItemAvailability(legacy.token, itemId, { availabilityStatus: "sold_out" });
    await expect(venueService().matchVenueItem({
      ...request,
      merchantSlug: legacy.merchantSlug,
      menuSlug: "sold-out-case",
    })).rejects.toMatchObject({ detail: { code: "NO_ACTIVE_ITEMS" } });
  });

  it("sends only active, preference-eligible IDs to the provider", async () => {
    const selectVenueItem = vi.fn(async (modelRequest: VenueModelRequest) => ({
      selection: modelSelection(modelRequest.allowedItems[0]!.id, "Allowed."),
      metadata: { provider: "spy", model: "spy", attempt: 1, durationMs: 0 },
    }));
    const provider: ModelProvider = { id: "spy", selectVenueItem };
    const service = new DefaultVenueService(anonVenueRepository(), provider);
    await service.matchVenueItem(request);
    expect(selectVenueItem).toHaveBeenCalledOnce();
    expect(selectVenueItem.mock.calls[0]![0].allowedItems.map((item) => item.id)).toEqual([
      "33333333-3333-4333-8333-333333333331",
      "33333333-3333-4333-8333-333333333332",
    ]);
  });

  it("fails closed for unknown and cross-menu item IDs", async () => {
    for (const matchedItemId of [
      "99999999-9999-4999-8999-999999999999",
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
    ]) {
      const provider = fixedProvider(matchedItemId, "Invented model text.");
      await expect(new DefaultVenueService(anonVenueRepository(), provider).matchVenueItem(request))
        .rejects.toMatchObject({ detail: { code: "INVALID_MATCH_SELECTION" } });
    }
  });

  it("takes menu facts from the repository while preserving only the provider explanation", async () => {
    const provider = fixedProvider("33333333-3333-4333-8333-333333333331", "Selected for the requested spice.");
    const result = await new DefaultVenueService(anonVenueRepository(), provider).matchVenueItem(request);
    // menu_items has no price column in the shared schema, so legacy fixture
    // prices are lost in DB mode and surface as null (fixture mode showed "$19").
    expect(result.item).toMatchObject({ name: "Holy Shishito", price: null, availabilityStatus: "active" });
    expect(result.whyThisMatch).toBe("Selected for the requested spice.");
  });

  it("revalidates current availability after provider selection", async () => {
    const repository = anonVenueRepository();
    const getCurrentMenuItem = vi.spyOn(repository, "getCurrentMenuItem").mockResolvedValue(null);
    const provider = fixedProvider("33333333-3333-4333-8333-333333333331", "Allowed first, unavailable later.");
    await expect(new DefaultVenueService(repository, provider).matchVenueItem(request))
      .rejects.toBeInstanceOf(VenueServiceError);
    expect(getCurrentMenuItem).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222221",
      "33333333-3333-4333-8333-333333333331",
    );
  });
});

describe("DefaultManagementService", () => {
  it("reports management as unavailable when only public Supabase credentials are configured", async () => {
    await expect(new UnavailableManagementService().getManagedMerchant("any-token"))
      .rejects.toMatchObject({
        httpStatus: 503,
        detail: { code: "INTERNAL_ERROR", retryable: false },
      });
  });

  it("requires a valid private management token", async () => {
    const service = new DefaultManagementService(managementRepository());
    await expect(service.getManagedMerchant("not-a-valid-token")).rejects.toMatchObject({
      detail: { code: "UNAUTHORIZED" },
    });
  });

  it("creates a draft, adds an active item and publishes the menu", async () => {
    const context = await createLegacyMerchantContext("svc-test-publish");
    const management = new DefaultManagementService(managementRepository());
    let merchant = await management.createMenu(context.token, {
      name: "Sunday Test", slug: "sunday-test", shortIntro: null,
    });
    const menu = merchant.menus.find((entry) => entry.slug === "sunday-test")!;
    expect(menu.status).toBe("draft");
    merchant = await management.createMenuItem(context.token, menu.id, {
      name: "Test Collins", description: "A test-only drink.", imageUrl: null,
      alcoholic: true, baseSpirit: "gin", flavorTags: ["bright"], moodTags: ["social"],
      ingredients: ["gin", "lemon"], allergens: [], section: "Tests",
    });
    merchant = await management.publishMenu(context.token, menu.id);
    expect(merchant.menus.find((entry) => entry.id === menu.id)).toMatchObject({
      status: "published", publishedVersionId: expect.any(String),
    });
  });

  it("updates availability immediately for public and matching reads", async () => {
    const context = await createLegacyMerchantContext("svc-test-availability");
    const management = new DefaultManagementService(managementRepository());
    let merchant = await management.createMenu(context.token, { name: "Main", slug: "main", shortIntro: null });
    const menuId = merchant.menus.find((entry) => entry.slug === "main")!.id;
    merchant = await management.createMenuItem(context.token, menuId, {
      name: "Soon Hidden", description: "Spicy signature.", imageUrl: null,
      alcoholic: true, baseSpirit: "tequila", flavorTags: ["spicy"], moodTags: ["adventurous"],
      ingredients: ["tequila", "chili"], allergens: [], section: null,
    });
    const hiddenItemId = merchant.menus
      .find((entry) => entry.id === menuId)!
      .items.find((item) => item.name === "Soon Hidden")!.id;
    await management.createMenuItem(context.token, menuId, {
      name: "Still Active", description: "Stays on the menu.", imageUrl: null,
      alcoholic: true, baseSpirit: "gin", flavorTags: ["fresh"], moodTags: ["social"],
      ingredients: ["gin", "lemon"], allergens: [], section: null,
    });
    await management.publishMenu(context.token, menuId);

    const venue = new DefaultVenueService(anonVenueRepository(), fixedProvider(hiddenItemId, "Was active."));
    await management.updateMenuItemAvailability(context.token, hiddenItemId, { availabilityStatus: "hidden" });
    const menu = await venue.getPublishedVenueMenu(context.merchantSlug, "main");
    expect(menu.items.map((item) => item.id)).not.toContain(hiddenItemId);
    expect(menu.items.map((item) => item.name)).toContain("Still Active");
    await expect(venue.matchVenueItem({
      ...request,
      merchantSlug: context.merchantSlug,
      menuSlug: "main",
    })).rejects.toMatchObject({
      detail: { code: "INVALID_MATCH_SELECTION" },
    });
  });
});

describe("DeterministicMatchingProvider", () => {
  it("returns deterministic explanations", async () => {
    const service = venueService();
    const first = await service.matchVenueItem(request);
    const repeated = await service.matchVenueItem(request);
    expect(first.item.id).toBe(repeated.item.id);
    expect(first.item.name).toBe("Holy Shishito");
    expect(first.whyThisMatch).toContain("best matches");
  });

  it("surfaces configured provider failure as retryable", async () => {
    const unavailableProvider: ModelProvider = {
      id: "unavailable",
      async selectVenueItem() {
        throw new Error("Provider unavailable");
      },
    };
    await expect(new DefaultVenueService(anonVenueRepository(), unavailableProvider).matchVenueItem(request))
      .rejects.toMatchObject({ detail: { code: "MATCH_PROVIDER_UNAVAILABLE", retryable: true } });
  });
});

function venueService(repository = anonVenueRepository()): DefaultVenueService {
  return new DefaultVenueService(repository, new DeterministicMatchingProvider());
}

function modelSelection(matchedItemId: string, whyThisMatch: string) {
  return {
    matchedItemId,
    vibeName: "Model Authored Title",
    tastesLike: "Bright, clean, and easy to keep drinking.",
    flavorProfile: "bright, clean, crisp",
    whyThisMatch,
    roast: "You knew exactly what you wanted.",
  };
}

function fixedProvider(matchedItemId: string, whyThisMatch: string): ModelProvider {
  return {
    id: "fixed",
    async selectVenueItem() {
      return {
        selection: modelSelection(matchedItemId, whyThisMatch),
        metadata: { provider: "fixed", model: "fixed", attempt: 1, durationMs: 0 },
      };
    },
  };
}
