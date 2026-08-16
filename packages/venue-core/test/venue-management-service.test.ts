/**
 * Runs against the local Supabase stack (reset + seeded once per vitest run by
 * test/global-db-setup.ts). Seeded fixture data (the "Demo Bar" account and
 * its vibetail-taproom venue with relative-time events) is used for read-only
 * assertions only; every test that writes creates its own account and venue
 * under a "vms-test-*" name so this file cannot pollute (or be polluted by)
 * other test files sharing the same database reset.
 */
import type { DrinkInput, VenueMatchResult } from "@vibetail/contracts";
import { describe, expect, it } from "vitest";
import {
  DefaultVenueManagementService,
  UnavailableVenueManagementService,
  VenueManagementServiceError,
  computeDashboard,
  normalizeAccountName,
  rangeStart,
  slugify,
} from "../src/venue-management-service.js";
import { anonVenueRepository, uniqueName, venueManagementRepository } from "./helpers.js";

const DEMO_ACCOUNT_NAME = "Demo Bar";
// Seeded drink id in the vibetail-taproom library (fixtures/venue/menus.json).
const SMOKED_PEAR_ID = "77777777-0001-4001-8001-000000000001";

function createService(repository = venueManagementRepository()) {
  const service = new DefaultVenueManagementService(repository, {
    appUrl: "http://127.0.0.1:3000/",
    renderQrSvg: async (text) => `<svg data-url="${text}"></svg>`,
  });
  return { repository, service };
}

/** Read-only: sessions are additive rows, and dashboard tests only read seed events. */
async function demoToken(service: DefaultVenueManagementService): Promise<string> {
  return (await service.login(DEMO_ACCOUNT_NAME)).token;
}

interface VenueContext {
  token: string;
  venueId: string;
  venueSlug: string;
}

/** Fresh account plus venue per writing test, so seed data stays untouched. */
async function createVenueContext(
  service: DefaultVenueManagementService,
  label: string,
): Promise<VenueContext> {
  const name = uniqueName(`vms-test-${label}`);
  const { token } = await service.login(name);
  const session = await service.createVenue(token, {
    name,
    address: "1 Test Street",
    venueType: "cocktail_bar",
  });
  const venue = session.venue;
  if (!venue) throw new Error("createVenue did not attach a venue to the session");
  return { token, venueId: venue.id, venueSlug: venue.slug };
}

const drinkInput: DrinkInput = {
  name: "Test Sour",
  description: "A test drink",
  price: "$10",
  imageUrl: null,
  ingredients: ["gin", "lemon"],
  flavorTags: ["sour"],
  allergens: [],
  baseSpirit: "gin",
  strength: "medium",
  recommendationNote: null,
};

describe("venue sessions", () => {
  it("logs in by account name, keeps the session, and revokes it on logout", async () => {
    const { service } = createService();
    const displayName = `VMS Test Bar ${uniqueName("login")}`;
    const login = await service.login(displayName);
    expect(login.session.account.name).toBe(displayName.toLowerCase());
    expect(login.session.venue).toBeNull();
    const session = await service.getSession(login.token);
    expect(session.account.displayName).toBe(displayName);
    await service.logout(login.token);
    await expect(service.getSession(login.token)).rejects.toMatchObject({
      detail: { code: "UNAUTHORIZED" },
    });
  });

  it("accepts any unseen non-empty account name and creates a fresh account for it", async () => {
    // The fixture version used the single letter "A"; the shared database
    // needs unique names, so this uses a unique one (min-length input is
    // still enforced by venueLoginInputSchema at the contract level).
    const { service } = createService();
    const displayName = `VMS Fresh ${uniqueName("fresh")}`;
    const login = await service.login(displayName);
    expect(login.session).toMatchObject({
      account: { name: displayName.toLowerCase(), displayName },
      venue: null,
    });
  });

  it("rejects short and unknown tokens", async () => {
    const { service } = createService();
    await expect(service.getSession("short")).rejects.toMatchObject({ httpStatus: 401 });
    await expect(service.getSession("f".repeat(64))).rejects.toMatchObject({ httpStatus: 401 });
  });

  it("reuses the same account for differently-cased names", async () => {
    // Read-only against the seeded "demo bar" account linked to vibetail-taproom.
    const { service } = createService();
    const first = await service.login("Demo  Bar");
    expect(first.session.venue?.slug).toBe("vibetail-taproom");
    expect(first.session.account.name).toBe("demo bar");
  });
});

describe("venue creation", () => {
  it("creates a venue with a unique slug and blocks a second venue", async () => {
    const { service } = createService();
    const { token } = await service.login(uniqueName("vms-test-second-taproom"));
    const session = await service.createVenue(token, {
      name: "Vibetail Taproom",
      address: "1 Test Street",
      venueType: "cocktail_bar",
    });
    // The seeded slug "vibetail-taproom" is taken, so a numeric suffix is
    // appended. The exact number depends on how many colliding venues this
    // run created before, so only the shape is asserted.
    expect(session.venue?.slug).toMatch(/^vibetail-taproom-\d+$/);
    expect(session.venue?.address).toBe("1 Test Street");
    expect(session.venue?.isActive).toBe(true);
    await expect(service.createVenue(token, {
      name: "Another",
      address: "2 Test Street",
      venueType: "other",
    })).rejects.toMatchObject({ detail: { code: "CONFLICT" } });
  });
});

describe("drink library", () => {
  it("lists the seeded taproom drink library in creation order", async () => {
    // Read-only against seed: seed.sql staggers drinks.created_at so the
    // fixture array order survives the created_at-ascending listing.
    const { service } = createService();
    const token = await demoToken(service);
    const drinks = await service.listDrinks(token);
    expect(drinks.map((drink) => drink.name)).toEqual([
      "Smoked Pear Old Fashioned",
      "Yuzu Garden Spritz",
      "Velvet Espresso Martini",
      "Sunset Cooler",
    ]);
    expect(drinks[0]?.id).toBe(SMOKED_PEAR_ID);
  });

  it("creates, updates, and lists drinks", async () => {
    const { service } = createService();
    const { token } = await createVenueContext(service, "drinks");
    const created = await service.createDrink(token, drinkInput);
    expect(created.name).toBe("Test Sour");
    const updated = await service.updateDrink(token, created.id, { ...drinkInput, name: "Renamed Sour" });
    expect(updated.name).toBe("Renamed Sour");
    const names = (await service.listDrinks(token)).map((drink) => drink.name);
    expect(names).toContain("Renamed Sour");
  });

  it("propagates drink edits to every published menu that references it", async () => {
    const { service } = createService();
    const context = await createVenueContext(service, "propagate");
    const created = await service.createDrink(context.token, { ...drinkInput, name: "Smoked Pear" });
    const menu = await service.createMenu(context.token, { name: "Signature", drinkIds: [created.id] });
    await service.publishMenu(context.token, menu.id);
    await service.updateDrink(context.token, created.id, {
      ...drinkInput,
      name: "Smoked Pear 2.0",
      strength: "zero",
    });
    const lookup = await anonVenueRepository().lookupMenu(context.venueSlug, menu.slug);
    expect(lookup.kind).toBe("ok");
    if (lookup.kind !== "ok") return;
    const item = lookup.menu.items.find((entry) => entry.id === created.id);
    expect(item?.name).toBe("Smoked Pear 2.0");
    expect(item?.alcoholic).toBe(false);
  });

  it("reports usage and removes a deleted drink from all menus", async () => {
    const { service } = createService();
    const context = await createVenueContext(service, "usage");
    const espresso = await service.createDrink(context.token, { ...drinkInput, name: "Velvet Espresso" });
    const published = await service.createMenu(context.token, {
      name: "Signature Menu",
      drinkIds: [espresso.id],
    });
    await service.publishMenu(context.token, published.id);
    await service.createMenu(context.token, { name: "Winter Lab", drinkIds: [espresso.id] });
    const usage = await service.getDrinkUsage(context.token, espresso.id);
    expect(usage.menus.map((menu) => menu.name).sort()).toEqual(["Signature Menu", "Winter Lab"]);
    const result = await service.deleteDrink(context.token, espresso.id);
    expect(result.removedFromMenus).toBe(2);
    const drinks = await service.listDrinks(context.token);
    expect(drinks.some((drink) => drink.id === espresso.id)).toBe(false);
    const lookup = await anonVenueRepository().lookupMenu(context.venueSlug, published.slug);
    if (lookup.kind !== "ok") throw new Error("expected published menu");
    expect(lookup.menu.items.some((item) => item.id === espresso.id)).toBe(false);
  });

  it("returns validated suggestions when a drink info provider is configured", async () => {
    const service = new DefaultVenueManagementService(venueManagementRepository(), {
      appUrl: "http://127.0.0.1:3000",
      drinkInfoProvider: {
        id: "test",
        suggestDrinkInfo: async () => ({
          suggestion: {
            flavorTags: ["smoky"],
            baseSpirit: "whiskey",
            strength: "strong",
            recommendationNote: "For slow evenings.",
          },
          metadata: { provider: "test", model: "test", attempt: 1, durationMs: 1 },
        }),
      },
    });
    const { token } = await createVenueContext(service, "suggest");
    const suggestion = await service.suggestDrinkInfo(token, {
      name: "Old Fashioned",
      description: null,
      ingredients: ["rye"],
    });
    expect(suggestion.baseSpirit).toBe("whiskey");
  });

  it("fails drink suggestions closed when no provider is configured", async () => {
    const { service } = createService();
    const { token } = await createVenueContext(service, "suggest-none");
    await expect(service.suggestDrinkInfo(token, {
      name: "Mystery",
      description: null,
      ingredients: [],
    })).rejects.toMatchObject({ httpStatus: 503, detail: { code: "MATCH_PROVIDER_UNAVAILABLE" } });
  });
});

describe("venue menus", () => {
  it("creates a menu from library drinks and rejects unknown drinks", async () => {
    const { service } = createService();
    const context = await createVenueContext(service, "menus");
    const pear = await service.createDrink(context.token, { ...drinkInput, name: "Menu Pear" });
    const menu = await service.createMenu(context.token, { name: "Autumn Menu", drinkIds: [pear.id] });
    expect(menu.status).toBe("draft");
    expect(menu.drinkIds).toEqual([pear.id]);
    await expect(service.createMenu(context.token, {
      name: "Bad Menu",
      drinkIds: ["00000000-0000-4000-8000-000000000000"],
    })).rejects.toMatchObject({ detail: { code: "INVALID_REQUEST" } });
  });

  it("publishing auto-archives the previously published menu", async () => {
    const { service } = createService();
    const context = await createVenueContext(service, "archive");
    const drink = await service.createDrink(context.token, drinkInput);
    const first = await service.createMenu(context.token, { name: "First Menu", drinkIds: [drink.id] });
    await service.publishMenu(context.token, first.id);
    const second = await service.createMenu(context.token, { name: "Second Menu", drinkIds: [drink.id] });
    const menus = await service.publishMenu(context.token, second.id);
    const byId = new Map(menus.map((entry) => [entry.id, entry.status]));
    expect(byId.get(second.id)).toBe("published");
    expect(byId.get(first.id)).toBe("archived");
    const consumer = anonVenueRepository();
    // Anon RLS hides non-published menus entirely, so the archived menu now
    // reads as missing (fixture mode surfaced "menu_unpublished").
    const archivedLookup = await consumer.lookupMenu(context.venueSlug, first.slug);
    expect(archivedLookup.kind).toBe("menu_not_found");
    const currentLookup = await consumer.lookupMenu(context.venueSlug, second.slug);
    expect(currentLookup.kind).toBe("ok");
  });

  it("refuses to publish a menu without drinks", async () => {
    const { service } = createService();
    const context = await createVenueContext(service, "publish-empty");
    const menu = await service.createMenu(context.token, { name: "Empty Lab", drinkIds: [] });
    await expect(service.publishMenu(context.token, menu.id)).rejects.toMatchObject({
      detail: { code: "CONFLICT" },
    });
  });

  it("deleting a menu keeps its drinks in the library", async () => {
    const { service } = createService();
    const context = await createVenueContext(service, "delete-menu");
    const drink = await service.createDrink(context.token, drinkInput);
    const before = (await service.listDrinks(context.token)).length;
    const menu = await service.createMenu(context.token, { name: "Disposable", drinkIds: [drink.id] });
    await service.deleteMenu(context.token, menu.id);
    expect((await service.listDrinks(context.token)).length).toBe(before);
    const menus = await service.listMenus(context.token);
    expect(menus.some((entry) => entry.id === menu.id)).toBe(false);
  });

  it("supports renaming and replacing drinks without changing the slug", async () => {
    const { service } = createService();
    const context = await createVenueContext(service, "rename");
    const original = await service.createDrink(context.token, { ...drinkInput, name: "Original Pour" });
    const replacement = await service.createDrink(context.token, { ...drinkInput, name: "Replacement Pour" });
    const menu = await service.createMenu(context.token, { name: "Signature", drinkIds: [original.id] });
    expect(menu.slug).toBe("signature");
    const updated = await service.updateMenu(context.token, menu.id, {
      name: "Signature vNext",
      drinkIds: [replacement.id],
    });
    expect(updated.name).toBe("Signature vNext");
    expect(updated.slug).toBe("signature");
    expect(updated.drinkIds).toEqual([replacement.id]);
  });
});

describe("dashboard", () => {
  it("aggregates seeded events for 7d and 30d ranges", async () => {
    // Read-only: the seeded events use relative (now() - interval) timestamps,
    // so these counts are stable no matter when the seed ran.
    const { service } = createService();
    const token = await demoToken(service);
    const week = await service.getDashboard(token, "7d");
    expect(week.totalMatches).toBe(3);
    expect(week.menuViews).toBe(4);
    expect(week.feedback).toEqual({ total: 2, averageRating: 4.5 });
    expect(week.topDrinks[0]).toMatchObject({ itemId: SMOKED_PEAR_ID, matches: 2 });
    const month = await service.getDashboard(token, "30d");
    expect(month.totalMatches).toBe(4);
    expect(month.menuViews).toBe(5);
    expect(month.recentFeedback[0]?.comment).toContain("Perfect nightcap");
  });

  it("computes range starts and handles empty datasets", () => {
    const now = new Date("2026-08-14T15:30:00.000Z");
    expect(rangeStart("today", now).toISOString()).toBe("2026-08-14T00:00:00.000Z");
    expect(rangeStart("7d", now).toISOString()).toBe("2026-08-07T15:30:00.000Z");
    expect(rangeStart("30d", now).toISOString()).toBe("2026-07-15T15:30:00.000Z");
    const empty = computeDashboard("today", now.toISOString(), 0, [], []);
    expect(empty.feedback.averageRating).toBeNull();
    expect(empty.topDrinks).toEqual([]);
  });

  it("rounds average ratings to one decimal", () => {
    const feedback = [5, 4, 4].map((rating, index) => ({
      id: `55555555-000${index + 5}-4005-8005-00000000000${index}`,
      rating,
      comment: null,
      itemName: "Drink",
      createdAt: "2026-08-14T12:00:00.000Z",
    }));
    const stats = computeDashboard("7d", "2026-08-07T00:00:00.000Z", 0, [], feedback);
    expect(stats.feedback.averageRating).toBe(4.3);
  });
});

describe("match recording and feedback", () => {
  async function publishedVenue(service: DefaultVenueManagementService, label: string) {
    const context = await createVenueContext(service, label);
    const drink = await service.createDrink(context.token, { ...drinkInput, name: "Recorded Pour" });
    const menu = await service.createMenu(context.token, { name: "Recorded Menu", drinkIds: [drink.id] });
    await service.publishMenu(context.token, menu.id);
    return { context, menuId: menu.id, menuSlug: menu.slug, itemId: drink.id };
  }

  function matchResult(context: VenueContext, menuId: string, menuSlug: string, itemId: string): VenueMatchResult {
    return {
      venue: {
        id: context.venueId,
        slug: context.venueSlug,
        name: "Recorded Venue",
        shortIntro: null,
        logoUrl: null,
        coverImageUrl: null,
      },
      menu: { id: menuId, slug: menuSlug, name: "Recorded Menu" },
      item: {
        id: itemId,
        menuId,
        name: "Recorded Pour",
        description: null,
        price: "$10",
        imageUrl: null,
        alcoholic: true,
        baseSpirit: "gin",
        flavorTags: ["sour"],
        moodTags: [],
        ingredients: ["gin", "lemon"],
        allergens: [],
        recommendationPriority: 0,
        availabilityStatus: "active",
        section: null,
        sortOrder: 10,
      },
      vibeName: "Slow Monday Smoke",
      tastesLike: "Rye and pear, warm at the edges.",
      flavorProfile: "smoky, warm, spirit-forward",
      whyThisMatch: "Matches the smoky mood.",
      roast: "You call this a quiet night in.",
      traceId: "trace-test",
    };
  }

  it("records a match, accepts one feedback, and rejects duplicates", async () => {
    const { service } = createService();
    const { context, menuId, menuSlug, itemId } = await publishedVenue(service, "feedback");
    const matchId = await service.recordMatch(matchResult(context, menuId, menuSlug, itemId));
    expect(matchId).toMatch(/^[0-9a-f-]{36}$/);
    if (!matchId) throw new Error("expected matchId");
    const receipt = await service.submitFeedback(matchId, { rating: 5, comment: "Loved it" });
    expect(receipt.status).toBe("recorded");
    await expect(service.submitFeedback(matchId, { rating: 1 })).rejects.toMatchObject({
      httpStatus: 409,
    });
    const stats = await service.getDashboard(context.token, "today");
    expect(stats.recentFeedback.some((entry) => entry.comment === "Loved it")).toBe(true);
  });

  it("returns 404 for unknown or malformed match ids", async () => {
    const { service } = createService();
    await expect(service.submitFeedback("not-a-uuid", { rating: 3 })).rejects.toMatchObject({
      detail: { code: "MATCH_NOT_FOUND" },
    });
    await expect(service.submitFeedback("00000000-0000-4000-8000-00000000dead", { rating: 3 }))
      .rejects.toMatchObject({ httpStatus: 404 });
  });

  it("records menu views only for known venues", async () => {
    const { service, repository } = createService();
    const context = await createVenueContext(service, "views");
    await service.recordMenuView({ merchantSlug: context.venueSlug });
    await service.recordMenuView({ merchantSlug: "nope-does-not-exist" });
    const count = await repository.countMenuViews(context.venueId, new Date(Date.now() - 60_000).toISOString());
    expect(count).toBe(1);
  });
});

describe("QR codes", () => {
  it("encodes the stable venue URL", async () => {
    const { service } = createService();
    const context = await createVenueContext(service, "qr");
    const qr = await service.getQr(context.token);
    expect(qr.consumerUrl).toBe(`http://127.0.0.1:3000/m/${context.venueSlug}`);
    expect(qr.qrSvg).toContain(`http://127.0.0.1:3000/m/${context.venueSlug}`);
  });

  it("requires a venue before issuing a QR code", async () => {
    const { service } = createService();
    const { token } = await service.login(uniqueName("vms-test-no-venue"));
    await expect(service.getQr(token)).rejects.toMatchObject({ detail: { code: "FORBIDDEN" } });
  });
});

describe("unavailable venue backend", () => {
  it("fails closed for management but degrades public events to no-ops", async () => {
    const service = new UnavailableVenueManagementService();
    await expect(service.login("someone")).rejects.toMatchObject({ httpStatus: 503 });
    await expect(service.recordMenuView({ merchantSlug: "any" })).resolves.toBeUndefined();
    const error = await service.submitFeedback("00000000-0000-4000-8000-000000000000", { rating: 4 })
      .catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(VenueManagementServiceError);
  });
});

describe("helpers", () => {
  it("normalizes account names and slugifies venue names", () => {
    expect(normalizeAccountName("  Demo   Bar ")).toBe("demo bar");
    expect(slugify("Vibetail Taproom & Kitchen!")).toBe("vibetail-taproom-kitchen");
    expect(slugify("!!!")).toBe("venue");
  });
});
