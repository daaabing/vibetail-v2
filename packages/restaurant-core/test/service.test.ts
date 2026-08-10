import type { RestaurantMatchRequest } from "@vibetail/contracts";
import { DeterministicMatchingProvider, type ModelProvider, type RestaurantModelRequest } from "@vibetail/model-providers";
import { describe, expect, it, vi } from "vitest";
import { FixtureRestaurantRepository } from "../src/repositories/fixture.js";
import { DefaultManagementService } from "../src/management-service.js";
import { DefaultRestaurantService, RestaurantServiceError } from "../src/service.js";

const request: RestaurantMatchRequest = {
  merchantSlug: "double-chicken-please",
  menuSlug: "main",
  preferences: {
    mood: "adventurous",
    flavors: ["spicy"],
    alcoholPreference: "either",
    excludedAllergens: [],
    excludedIngredients: [],
    locale: "en",
  },
};

describe("DefaultRestaurantService", () => {
  it("lists active restaurants with published menus and excludes inactive merchants", async () => {
    const directory = await fixtureService().listActiveRestaurants();
    expect(directory.map((entry) => entry.restaurant.slug)).toEqual([
      "double-chicken-please",
      "nightjar-demo",
    ]);
    expect(directory.flatMap((entry) => entry.menus).map((menu) => menu.slug)).not.toContain("unpublished");
  });

  it("globally matches a canonical merchant, menu and active item with a deep link", async () => {
    const provider = fixedProvider("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", "Bright, botanical and zero proof.");
    const result = await new DefaultRestaurantService(new FixtureRestaurantRepository(), provider).matchGlobalItem({
      mood: "clear headed", flavors: ["fresh"], alcoholPreference: "non_alcoholic",
      excludedAllergens: [], excludedIngredients: [], locale: "en",
    });
    expect(result).toMatchObject({
      restaurant: { slug: "nightjar-demo" }, menu: { slug: "cocktails" },
      item: { name: "Neon Garden", availabilityStatus: "active" },
      restaurantSpecificUrl: "/m/nightjar-demo/cocktails",
    });
  });

  it("never sends inactive merchants, unpublished menus, sold-out or hidden items to global matching", async () => {
    const selectRestaurantItem = vi.fn(async (modelRequest: RestaurantModelRequest) => ({
      selection: { matchedItemId: modelRequest.allowedItems[0]!.id, whyThisMatch: "Valid." },
      metadata: { provider: "spy", model: "spy", attempt: 1, durationMs: 0 },
    }));
    const service = new DefaultRestaurantService(new FixtureRestaurantRepository(), { id: "spy", selectRestaurantItem });
    await service.matchGlobalItem(request.preferences);
    const ids = selectRestaurantItem.mock.calls[0]![0].allowedItems.map((item) => item.id);
    expect(ids).not.toContain("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3");
    expect(ids).not.toContain("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4");
    expect(ids).not.toContain("33333333-3333-4333-8333-333333333335");
  });

  it("fails closed when a global provider returns an ID outside the candidate allowlist", async () => {
    await expect(new DefaultRestaurantService(new FixtureRestaurantRepository(), fixedProvider(
      "99999999-9999-4999-8999-999999999999", "Invented.",
    )).matchGlobalItem(request.preferences)).rejects.toMatchObject({ detail: { code: "INVALID_MATCH_SELECTION" } });
  });

  it("loads only the active merchant's published menu and hides hidden items", async () => {
    const service = fixtureService();
    const menu = await service.getPublishedRestaurantMenu("double-chicken-please", "main");
    expect(menu.restaurant.name).toBe("Double Chicken Please");
    expect(menu.items.map((item) => item.name)).toEqual(["Holy Shishito", "Cuppa Sunshine", "Waldorf Salad"]);
    expect(menu.items.map((item) => item.name)).not.toContain("Hidden Test Drink");
  });

  it.each([
    ["missing", "main", "MERCHANT_NOT_FOUND"],
    ["inactive-restaurant", "main", "MERCHANT_INACTIVE"],
    ["double-chicken-please", "missing", "MENU_NOT_FOUND"],
    ["double-chicken-please", "unpublished", "MENU_UNPUBLISHED"],
  ])("returns a precise unavailable state for %s/%s", async (merchantSlug, menuSlug, code) => {
    await expect(fixtureService().getPublishedRestaurantMenu(merchantSlug, menuSlug))
      .rejects.toMatchObject({ detail: { code } });
  });

  it("distinguishes an empty menu from a menu with no active items", async () => {
    await expect(fixtureService().matchRestaurantItem({ ...request, menuSlug: "empty" }))
      .rejects.toMatchObject({ detail: { code: "MENU_EMPTY" } });
    await expect(fixtureService().matchRestaurantItem({ ...request, menuSlug: "no-active" }))
      .rejects.toMatchObject({ detail: { code: "NO_ACTIVE_ITEMS" } });
  });

  it("sends only active, preference-eligible IDs to the provider", async () => {
    const selectRestaurantItem = vi.fn(async (modelRequest: RestaurantModelRequest) => ({
      selection: { matchedItemId: modelRequest.allowedItems[0]!.id, whyThisMatch: "Allowed." },
      metadata: { provider: "spy", model: "spy", attempt: 1, durationMs: 0 },
    }));
    const provider: ModelProvider = { id: "spy", selectRestaurantItem };
    const service = new DefaultRestaurantService(new FixtureRestaurantRepository(), provider);
    await service.matchRestaurantItem(request);
    expect(selectRestaurantItem).toHaveBeenCalledOnce();
    expect(selectRestaurantItem.mock.calls[0]![0].allowedItems.map((item) => item.id)).toEqual([
      "33333333-3333-4333-8333-333333333331",
      "33333333-3333-4333-8333-333333333332",
    ]);
  });

  it("fails closed for unknown and cross-menu item IDs", async () => {
    for (const matchedItemId of [
      "99999999-9999-4999-8999-999999999999",
      "33333333-3333-4333-8333-333333333338",
    ]) {
      const provider = fixedProvider(matchedItemId, "Invented model text.");
      await expect(new DefaultRestaurantService(new FixtureRestaurantRepository(), provider).matchRestaurantItem(request))
        .rejects.toMatchObject({ detail: { code: "INVALID_MATCH_SELECTION" } });
    }
  });

  it("takes menu facts from the repository while preserving only the provider explanation", async () => {
    const provider = fixedProvider("33333333-3333-4333-8333-333333333331", "Selected for the requested spice.");
    const result = await new DefaultRestaurantService(new FixtureRestaurantRepository(), provider).matchRestaurantItem(request);
    expect(result.item).toMatchObject({ name: "Holy Shishito", price: "$19", availabilityStatus: "active" });
    expect(result.whyThisMatch).toBe("Selected for the requested spice.");
  });

  it("revalidates current availability after provider selection", async () => {
    const repository = new FixtureRestaurantRepository();
    const getCurrentMenuItem = vi.spyOn(repository, "getCurrentMenuItem").mockResolvedValue(null);
    const provider = fixedProvider("33333333-3333-4333-8333-333333333331", "Allowed first, unavailable later.");
    await expect(new DefaultRestaurantService(repository, provider).matchRestaurantItem(request))
      .rejects.toBeInstanceOf(RestaurantServiceError);
    expect(getCurrentMenuItem).toHaveBeenCalledWith(
      "22222222-2222-4222-8222-222222222221",
      "33333333-3333-4333-8333-333333333331",
    );
  });
});

describe("DefaultManagementService", () => {
  it("requires a valid private fixture token", async () => {
    const service = new DefaultManagementService(new FixtureRestaurantRepository());
    await expect(service.getManagedMerchant("not-a-valid-token")).rejects.toMatchObject({
      detail: { code: "UNAUTHORIZED" },
    });
  });

  it("creates a draft, adds an active item and publishes the menu", async () => {
    const repository = new FixtureRestaurantRepository();
    const management = new DefaultManagementService(repository);
    const token = "fixture-double-chicken-demo";
    let merchant = await management.createMenu(token, { name: "Sunday Test", slug: "sunday-test", shortIntro: null });
    const menu = merchant.menus.find((entry) => entry.slug === "sunday-test")!;
    expect(menu.status).toBe("draft");
    merchant = await management.createMenuItem(token, menu.id, {
      name: "Test Collins", description: "A fixture-only drink.", imageUrl: null,
      alcoholic: true, baseSpirit: "gin", flavorTags: ["bright"], moodTags: ["social"],
      ingredients: ["gin", "lemon"], allergens: [], section: "Tests",
    });
    merchant = await management.publishMenu(token, menu.id);
    expect(merchant.menus.find((entry) => entry.id === menu.id)).toMatchObject({
      status: "published", publishedVersionId: expect.any(String),
    });
  });

  it("updates availability immediately for public and matching reads", async () => {
    const repository = new FixtureRestaurantRepository();
    const management = new DefaultManagementService(repository);
    const restaurant = new DefaultRestaurantService(repository, fixedProvider(
      "33333333-3333-4333-8333-333333333331", "Was active.",
    ));
    await management.updateMenuItemAvailability(
      "fixture-double-chicken-demo", "33333333-3333-4333-8333-333333333331", { availabilityStatus: "hidden" },
    );
    const menu = await restaurant.getPublishedRestaurantMenu("double-chicken-please", "main");
    expect(menu.items.map((item) => item.id)).not.toContain("33333333-3333-4333-8333-333333333331");
    await expect(restaurant.matchRestaurantItem(request)).rejects.toMatchObject({
      detail: { code: "INVALID_MATCH_SELECTION" },
    });
  });
});

describe("DeterministicMatchingProvider", () => {
  it("returns deterministic and bilingual explanations", async () => {
    const service = fixtureService();
    const english = await service.matchRestaurantItem(request);
    const repeated = await service.matchRestaurantItem(request);
    const chinese = await service.matchRestaurantItem({ ...request, preferences: { ...request.preferences, locale: "zh" } });
    expect(english.item.id).toBe(repeated.item.id);
    expect(english.item.name).toBe("Holy Shishito");
    expect(english.whyThisMatch).toContain("best matches");
    expect(chinese.whyThisMatch).toContain("最贴近");
  });

  it("surfaces configured provider failure as retryable", async () => {
    await expect(fixtureService().matchRestaurantItem({ ...request, menuSlug: "matching-failure" }))
      .rejects.toMatchObject({ detail: { code: "MATCH_PROVIDER_UNAVAILABLE", retryable: true } });
  });
});

function fixtureService(): DefaultRestaurantService {
  const repository = new FixtureRestaurantRepository();
  return new DefaultRestaurantService(repository, new DeterministicMatchingProvider({
    failureMenuIds: repository.fixture.matchingFailureMenuIds,
  }));
}

function fixedProvider(matchedItemId: string, whyThisMatch: string): ModelProvider {
  return {
    id: "fixed",
    async selectRestaurantItem() {
      return {
        selection: { matchedItemId, whyThisMatch },
        metadata: { provider: "fixed", model: "fixed", attempt: 1, durationMs: 0 },
      };
    },
  };
}
