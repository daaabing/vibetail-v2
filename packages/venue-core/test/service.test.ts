import type { VenueMatchRequest } from "@vibetail/contracts";
import { DeterministicMatchingProvider, type ModelProvider, type VenueModelRequest } from "@vibetail/model-providers";
import { describe, expect, it, vi } from "vitest";
import { FixtureVenueRepository } from "../src/repositories/fixture.js";
import { DefaultManagementService, UnavailableManagementService } from "../src/management-service.js";
import { DefaultVenueService, VenueServiceError } from "../src/service.js";

const request: VenueMatchRequest = {
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

describe("DefaultVenueService", () => {
  it("lists active venues with published menus and excludes inactive merchants", async () => {
    const directory = await fixtureService().listActiveVenues();
    expect(directory.map((entry) => entry.venue.slug)).toEqual([
      "double-chicken-please",
      "nightjar-demo",
      "vibetail-taproom",
    ]);
    expect(directory.flatMap((entry) => entry.menus).map((menu) => menu.slug)).toEqual([
      "main",
      "cocktails",
      "signature",
    ]);
    expect(directory.flatMap((entry) => entry.menus).map((menu) => menu.slug)).not.toContain("unpublished");
  });

  it("globally matches a canonical merchant, menu and active item with a deep link", async () => {
    const provider = fixedProvider("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1", "Bright, botanical and zero proof.");
    const result = await new DefaultVenueService(new FixtureVenueRepository(), provider).matchGlobalItem({
      mood: "clear headed", flavors: ["fresh"], alcoholPreference: "non_alcoholic",
      excludedAllergens: [], excludedIngredients: [], locale: "en",
    });
    expect(result).toMatchObject({
      venue: { slug: "nightjar-demo" }, menu: { slug: "cocktails" },
      item: { name: "Neon Garden", availabilityStatus: "active" },
      venueSpecificUrl: "/m/nightjar-demo/cocktails",
    });
  });

  it("never sends inactive merchants, unpublished menus, sold-out or hidden items to global matching", async () => {
    const selectVenueItem = vi.fn(async (modelRequest: VenueModelRequest) => ({
      selection: { matchedItemId: modelRequest.allowedItems[0]!.id, whyThisMatch: "Valid." },
      metadata: { provider: "spy", model: "spy", attempt: 1, durationMs: 0 },
    }));
    const service = new DefaultVenueService(new FixtureVenueRepository(), { id: "spy", selectVenueItem });
    await service.matchGlobalItem(request.preferences);
    const ids = selectVenueItem.mock.calls[0]![0].allowedItems.map((item) => item.id);
    expect(ids).not.toContain("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3");
    expect(ids).not.toContain("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4");
  });

  it("fails closed when a global provider returns an ID outside the candidate allowlist", async () => {
    await expect(new DefaultVenueService(new FixtureVenueRepository(), fixedProvider(
      "99999999-9999-4999-8999-999999999999", "Invented.",
    )).matchGlobalItem(request.preferences)).rejects.toMatchObject({ detail: { code: "INVALID_MATCH_SELECTION" } });
  });

  it("loads only the active merchant's published menu and hides hidden items", async () => {
    const service = fixtureService();
    const menu = await service.getPublishedVenueMenu("double-chicken-please", "main");
    expect(menu.venue.name).toBe("Double Chicken Please");
    expect(menu.items.map((item) => item.name)).toEqual(["Holy Shishito", "Cuppa Sunshine", "Waldorf Salad"]);
    expect(menu.items.map((item) => item.name)).not.toContain("Hidden Test Drink");
  });

  it.each([
    ["missing", "main", "MERCHANT_NOT_FOUND"],
    ["inactive-venue", "main", "MERCHANT_INACTIVE"],
    ["double-chicken-please", "missing", "MENU_NOT_FOUND"],
    ["double-chicken-please", "unpublished", "MENU_UNPUBLISHED"],
  ])("returns a precise unavailable state for %s/%s", async (merchantSlug, menuSlug, code) => {
    await expect(fixtureService().getPublishedVenueMenu(merchantSlug, menuSlug))
      .rejects.toMatchObject({ detail: { code } });
  });

  it("distinguishes an empty menu from a menu with no active items", async () => {
    const emptyRepository = new FixtureVenueRepository();
    const emptyMenu = emptyRepository.fixture.merchants[0]!.menus.find((menu) => menu.slug === "main")!;
    emptyMenu.items = [];
    await expect(fixtureService(emptyRepository).matchVenueItem(request))
      .rejects.toMatchObject({ detail: { code: "MENU_EMPTY" } });

    const unavailableRepository = new FixtureVenueRepository();
    const unavailableMenu = unavailableRepository.fixture.merchants[0]!.menus.find((menu) => menu.slug === "main")!;
    for (const item of unavailableMenu.items) item.availabilityStatus = "sold_out";
    await expect(fixtureService(unavailableRepository).matchVenueItem(request))
      .rejects.toMatchObject({ detail: { code: "NO_ACTIVE_ITEMS" } });
  });

  it("sends only active, preference-eligible IDs to the provider", async () => {
    const selectVenueItem = vi.fn(async (modelRequest: VenueModelRequest) => ({
      selection: { matchedItemId: modelRequest.allowedItems[0]!.id, whyThisMatch: "Allowed." },
      metadata: { provider: "spy", model: "spy", attempt: 1, durationMs: 0 },
    }));
    const provider: ModelProvider = { id: "spy", selectVenueItem };
    const service = new DefaultVenueService(new FixtureVenueRepository(), provider);
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
      await expect(new DefaultVenueService(new FixtureVenueRepository(), provider).matchVenueItem(request))
        .rejects.toMatchObject({ detail: { code: "INVALID_MATCH_SELECTION" } });
    }
  });

  it("takes menu facts from the repository while preserving only the provider explanation", async () => {
    const provider = fixedProvider("33333333-3333-4333-8333-333333333331", "Selected for the requested spice.");
    const result = await new DefaultVenueService(new FixtureVenueRepository(), provider).matchVenueItem(request);
    expect(result.item).toMatchObject({ name: "Holy Shishito", price: "$19", availabilityStatus: "active" });
    expect(result.whyThisMatch).toBe("Selected for the requested spice.");
  });

  it("revalidates current availability after provider selection", async () => {
    const repository = new FixtureVenueRepository();
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

  it("requires a valid private fixture token", async () => {
    const service = new DefaultManagementService(new FixtureVenueRepository());
    await expect(service.getManagedMerchant("not-a-valid-token")).rejects.toMatchObject({
      detail: { code: "UNAUTHORIZED" },
    });
  });

  it("creates a draft, adds an active item and publishes the menu", async () => {
    const repository = new FixtureVenueRepository();
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
    const repository = new FixtureVenueRepository();
    const management = new DefaultManagementService(repository);
    const venue = new DefaultVenueService(repository, fixedProvider(
      "33333333-3333-4333-8333-333333333331", "Was active.",
    ));
    await management.updateMenuItemAvailability(
      "fixture-double-chicken-demo", "33333333-3333-4333-8333-333333333331", { availabilityStatus: "hidden" },
    );
    const menu = await venue.getPublishedVenueMenu("double-chicken-please", "main");
    expect(menu.items.map((item) => item.id)).not.toContain("33333333-3333-4333-8333-333333333331");
    await expect(venue.matchVenueItem(request)).rejects.toMatchObject({
      detail: { code: "INVALID_MATCH_SELECTION" },
    });
  });
});

describe("DeterministicMatchingProvider", () => {
  it("returns deterministic and bilingual explanations", async () => {
    const service = fixtureService();
    const english = await service.matchVenueItem(request);
    const repeated = await service.matchVenueItem(request);
    const chinese = await service.matchVenueItem({ ...request, preferences: { ...request.preferences, locale: "zh" } });
    expect(english.item.id).toBe(repeated.item.id);
    expect(english.item.name).toBe("Holy Shishito");
    expect(english.whyThisMatch).toContain("best matches");
    expect(chinese.whyThisMatch).toContain("最贴近");
  });

  it("surfaces configured provider failure as retryable", async () => {
    const unavailableProvider: ModelProvider = {
      id: "unavailable",
      async selectVenueItem() {
        throw new Error("Provider unavailable");
      },
    };
    await expect(new DefaultVenueService(new FixtureVenueRepository(), unavailableProvider).matchVenueItem(request))
      .rejects.toMatchObject({ detail: { code: "MATCH_PROVIDER_UNAVAILABLE", retryable: true } });
  });
});

function fixtureService(repository = new FixtureVenueRepository()): DefaultVenueService {
  return new DefaultVenueService(repository, new DeterministicMatchingProvider());
}

function fixedProvider(matchedItemId: string, whyThisMatch: string): ModelProvider {
  return {
    id: "fixed",
    async selectVenueItem() {
      return {
        selection: { matchedItemId, whyThisMatch },
        metadata: { provider: "fixed", model: "fixed", attempt: 1, durationMs: 0 },
      };
    },
  };
}
