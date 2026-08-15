import {
  DeterministicMatchingProvider,
  DeterministicMenuPhotoScanProvider,
  OriginalDrinkPhotoProvider,
  type ModelProvider,
} from "@vibetail/model-providers";
import {
  DefaultManagementService,
  DefaultVenueManagementService,
  DefaultVenueService,
  FixtureVenueRepository,
  FixtureVenueMediaStorage,
  UnavailableVenueManagementService,
} from "@vibetail/venue-core";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createWebApp } from "./app.js";

function app(venueProvider?: ModelProvider) {
  const repository = new FixtureVenueRepository();
  const provider = new DeterministicMatchingProvider();
  const mediaStorage = new FixtureVenueMediaStorage("http://127.0.0.1:3000");
  return createWebApp({
    venueService: new DefaultVenueService(repository, venueProvider ?? provider),
    managementService: new DefaultManagementService(repository),
    venueManagementService: new DefaultVenueManagementService(repository, {
      appUrl: "http://127.0.0.1:3000",
      drinkInfoProvider: provider,
      menuPhotoScanProvider: new DeterministicMenuPhotoScanProvider(),
      drinkPhotoProvider: new OriginalDrinkPhotoProvider(),
      mediaStorage,
      renderQrSvg: async (text) => `<svg data-url="${text}"></svg>`,
    }),
    fixtureVenueMediaStorage: mediaStorage,
    dataSource: "fixture",
    testFrontend: true,
  });
}

describe("venue HTTP slice", () => {
  it("reports liveness and dependency readiness", async () => {
    expect((await request(app()).get("/health").expect(200)).body.status).toBe("ok");
    expect((await request(app()).get("/ready").expect(200)).body).toMatchObject({
      status: "ready",
      checks: [{ name: "venue_repository", ready: true, detail: "fixture" }],
    });
  });

  it("fails readiness closed when a required dependency is unavailable", async () => {
    const repository = new FixtureVenueRepository();
    const unavailable = createWebApp({
      venueService: new DefaultVenueService(repository, new DeterministicMatchingProvider()),
      managementService: new DefaultManagementService(repository),
      venueManagementService: new UnavailableVenueManagementService(),
      dataSource: "fixture",
      checkReadiness: async () => [{ name: "venue_repository", ready: false, detail: "unavailable" }],
      testFrontend: true,
    });
    expect((await request(unavailable).get("/ready").expect(503)).body.status).toBe("not_ready");
  });

  it("serves the landing SPA route and active venue directory", async () => {
    expect((await request(app()).get("/").expect(200)).text).toContain('<div id="root"></div>');
    const directory = await request(app()).get("/v1/venues").expect(200);
    expect(directory.body.map((entry: { venue: { slug: string } }) => entry.venue.slug)).toEqual([
      "double-chicken-please", "nightjar-demo", "vibetail-taproom",
    ]);
    expect(directory.body.flatMap((entry: { menus: Array<{ slug: string }> }) => entry.menus.map((menu) => menu.slug)))
      .toEqual(["main", "cocktails", "signature"]);
  });

  it("completes a global match with a venue-specific URL", async () => {
    const response = await request(app()).post("/v1/matches/global").send({
      preferences: { mood: "clear headed", flavors: ["fresh"], alcoholPreference: "non_alcoholic" },
    }).expect(200);
    expect(response.body).toMatchObject({
      venue: { slug: "nightjar-demo" }, menu: { slug: "cocktails" },
      item: { availabilityStatus: "active" }, venueSpecificUrl: "/m/nightjar-demo/cocktails",
    });
  });

  it("loads the fixture menu without hidden items", async () => {
    const response = await request(app()).get("/v1/venues/double-chicken-please/menus/main").expect(200);
    expect(response.body.venue.name).toBe("Double Chicken Please");
    expect(response.body.items.map((item: { name: string }) => item.name)).toEqual(["Holy Shishito", "Cuppa Sunshine", "Waldorf Salad"]);
  });

  it("matches from the active allowlist end to end", async () => {
    const response = await request(app())
      .post("/v1/venues/double-chicken-please/menus/main/match")
      .send({ preferences: { mood: "adventurous", flavors: ["spicy"], locale: "en" } })
      .expect(200);
    expect(response.body.item).toMatchObject({ name: "Holy Shishito", availabilityStatus: "active" });
    expect(response.body.traceId).toEqual(expect.any(String));
  });

  it.each([
    ["/v1/venues/missing/menus/main", "MERCHANT_NOT_FOUND"],
    ["/v1/venues/inactive-venue/menus/main", "MERCHANT_INACTIVE"],
    ["/v1/venues/double-chicken-please/menus/unpublished", "MENU_UNPUBLISHED"],
  ])("returns structured errors for %s", async (url, code) => {
    const response = await request(app()).get(url).expect(404);
    expect(response.body).toMatchObject({ code, retryable: false });
  });

  it("returns a retryable matching provider failure", async () => {
    const unavailableProvider: ModelProvider = {
      id: "unavailable",
      async selectVenueItem() {
        throw new Error("Provider unavailable");
      },
    };
    const response = await request(app(unavailableProvider))
      .post("/v1/venues/double-chicken-please/menus/main/match")
      .send({ preferences: { mood: "curious" } })
      .expect(503);
    expect(response.body).toMatchObject({ code: "MATCH_PROVIDER_UNAVAILABLE", retryable: true });
  });

  it("serves the venue page route", async () => {
    const response = await request(app()).get("/m/double-chicken-please/main").expect(200);
    expect(response.text).toContain('<div id="root"></div>');
  });

  it("authorizes management, updates availability and publishes a fixture menu", async () => {
    const instance = app();
    const auth = { Authorization: "Bearer fixture-double-chicken-demo" };
    await request(instance).get("/v1/management/merchant").expect(401);
    const managed = await request(instance).get("/v1/management/merchant").set(auth).expect(200);
    expect(managed.body.slug).toBe("double-chicken-please");

    await request(instance).patch("/v1/management/items/33333333-3333-4333-8333-333333333331/availability")
      .set(auth).send({ availabilityStatus: "sold_out" }).expect(200);
    const publicMenu = await request(instance).get("/v1/venues/double-chicken-please/menus/main").expect(200);
    expect(publicMenu.body.items.find((item: { id: string }) => item.id.endsWith("331"))).toMatchObject({ availabilityStatus: "sold_out" });
  });

  it("runs the venue backend journey from login to dashboard", async () => {
    const instance = app();

    await request(instance).get("/v1/venue/drinks").expect(401);
    const login = await request(instance).post("/v1/venue/session").send({ name: "Journey Bar" }).expect(201);
    expect(login.body.session.venue).toBeNull();
    const auth = { Authorization: `Bearer ${login.body.token as string}` };

    const created = await request(instance).post("/v1/venue").set(auth)
      .send({ name: "Journey Bar", address: "42 Test Ave", venueType: "cocktail_bar" }).expect(201);
    expect(created.body.venue).toMatchObject({ slug: "journey-bar", address: "42 Test Ave" });

    await request(instance).get("/v1/venues/journey-bar/current-menu").expect(404)
      .then((response) => expect(response.body.code).toBe("NO_PUBLISHED_MENU"));

    const suggest = await request(instance).post("/v1/venue/drinks/suggest").set(auth)
      .send({ name: "Mezcal Highball", ingredients: ["mezcal", "soda", "lime"] }).expect(200);
    expect(suggest.body).toMatchObject({ baseSpirit: "tequila", strength: "light" });
    expect(suggest.body.flavorTags).toContain("smoky");

    const drink = await request(instance).post("/v1/venue/drinks").set(auth).send({
      name: "Mezcal Highball",
      description: "Long, smoky, and bright.",
      price: "$15",
      imageUrl: null,
      ingredients: ["mezcal", "soda", "lime"],
      flavorTags: suggest.body.flavorTags,
      allergens: [],
      baseSpirit: suggest.body.baseSpirit,
      strength: suggest.body.strength,
      recommendationNote: suggest.body.recommendationNote,
    }).expect(201);

    const menu = await request(instance).post("/v1/venue/menus").set(auth)
      .send({ name: "Opening Menu", drinkIds: [drink.body.id] }).expect(201);
    const published = await request(instance)
      .post(`/v1/venue/menus/${menu.body.id as string}/publish`).set(auth).expect(200);
    expect(published.body.find((entry: { id: string }) => entry.id === menu.body.id).status).toBe("published");

    const second = await request(instance).post("/v1/venue/menus").set(auth)
      .send({ name: "Second Menu", drinkIds: [drink.body.id] }).expect(201);
    const republished = await request(instance)
      .post(`/v1/venue/menus/${second.body.id as string}/publish`).set(auth).expect(200);
    const statuses = new Map(republished.body.map((entry: { id: string; status: string }) => [entry.id, entry.status]));
    expect(statuses.get(menu.body.id)).toBe("archived");
    expect(statuses.get(second.body.id)).toBe("published");

    const qr = await request(instance).get("/v1/venue/qr").set(auth).expect(200);
    expect(qr.body.consumerUrl).toBe("http://127.0.0.1:3000/m/journey-bar");
    expect(qr.body.qrSvg).toContain("journey-bar");

    const current = await request(instance).get("/v1/venues/journey-bar/current-menu").expect(200);
    expect(current.body.slug).toBe("second-menu");
    expect(current.body.items).toHaveLength(1);

    await request(instance).post("/v1/events/menu-views")
      .send({ merchantSlug: "journey-bar", menuId: current.body.id }).expect(204);

    const match = await request(instance).post("/v1/venues/journey-bar/menus/second-menu/match")
      .send({ preferences: { mood: "smoky evening", flavors: ["smoky"] } }).expect(200);
    expect(match.body.matchId).toEqual(expect.any(String));

    await request(instance).post(`/v1/matches/${match.body.matchId as string}/feedback`)
      .send({ rating: 5, comment: "Perfect pick." }).expect(201);
    await request(instance).post(`/v1/matches/${match.body.matchId as string}/feedback`)
      .send({ rating: 1 }).expect(409);
    await request(instance).post("/v1/matches/00000000-0000-4000-8000-00000000dead/feedback")
      .send({ rating: 3 }).expect(404);

    const dashboard = await request(instance).get("/v1/venue/dashboard?range=today").set(auth).expect(200);
    expect(dashboard.body).toMatchObject({
      totalMatches: 1,
      menuViews: 1,
      feedback: { total: 1, averageRating: 5 },
    });
    expect(dashboard.body.topDrinks[0]).toMatchObject({ name: "Mezcal Highball", matches: 1 });
    expect(dashboard.body.recentFeedback[0]).toMatchObject({ rating: 5, comment: "Perfect pick." });
  });

  it("creates a passwordless account from any non-empty name", async () => {
    const login = await request(app()).post("/v1/venue/session").send({ name: "A" }).expect(201);
    expect(login.body).toMatchObject({
      token: expect.any(String),
      session: { account: { name: "a", displayName: "A" }, venue: null },
    });
    await request(app()).post("/v1/venue/session").send({ name: "   " }).expect(400);
  });

  it("scans a menu photo, imports its drinks, and stores an individual drink photo", async () => {
    const instance = app();
    const login = await request(instance).post("/v1/venue/session").send({ name: "Demo Bar" }).expect(201);
    const auth = { Authorization: `Bearer ${login.body.token as string}` };
    const imageBase64 = Buffer.from("fixture-image").toString("base64");

    const scan = await request(instance).post("/v1/venue/menus/scan-photo").set(auth).send({
      imageBase64,
      imageContentType: "image/jpeg",
      fileName: "summer-menu.jpg",
    }).expect(200);
    expect(scan.body).toMatchObject({ suggestedMenuName: "Imported drinks", provider: "deterministic" });
    expect(scan.body.drinks).toHaveLength(3);

    const fetched = await request(instance).post("/v1/venue/menus/scan-url").set(auth).send({
      sourceUrl: "https://example.com/menu",
    }).expect(200);
    expect(fetched.body).toMatchObject({ suggestedMenuName: "Imported from web", provider: "deterministic-url" });
    expect(fetched.body.drinks).toHaveLength(3);

    const imported = await request(instance).post("/v1/venue/menus/import-scan").set(auth).send({
      name: "Scanned Summer Menu",
      drinks: scan.body.drinks,
    }).expect(201);
    expect(imported.body.menu).toMatchObject({ name: "Scanned Summer Menu", status: "draft" });
    expect(imported.body.menu.drinkIds).toHaveLength(3);

    const prepared = await request(instance).post("/v1/venue/drinks/photo").set(auth).send({
      name: "Garden Highball",
      description: "Bright",
      imageBase64,
      imageContentType: "image/jpeg",
    }).expect(200);
    expect(prepared.body).toMatchObject({ backgroundRemoved: false, provider: "original" });
    const mediaPath = new URL(prepared.body.imageUrl as string).pathname;
    expect((await request(instance).get(mediaPath).expect(200)).body).toEqual(Buffer.from("fixture-image"));
  });

  it("deletes drinks with menu cleanup through the HTTP surface", async () => {
    const instance = app();
    const login = await request(instance).post("/v1/venue/session").send({ name: "Demo Bar" }).expect(201);
    const auth = { Authorization: `Bearer ${login.body.token as string}` };
    expect(login.body.session.venue.slug).toBe("vibetail-taproom");

    const drinks = await request(instance).get("/v1/venue/drinks").set(auth).expect(200);
    const espresso = drinks.body.find((entry: { name: string }) => entry.name === "Velvet Espresso Martini");
    const usage = await request(instance)
      .get(`/v1/venue/drinks/${espresso.id as string}/usage`).set(auth).expect(200);
    expect(usage.body.menus).toHaveLength(2);

    const deleted = await request(instance)
      .delete(`/v1/venue/drinks/${espresso.id as string}`).set(auth).expect(200);
    expect(deleted.body.removedFromMenus).toBe(2);

    const publicMenu = await request(instance).get("/v1/venues/vibetail-taproom/current-menu").expect(200);
    expect(publicMenu.body.items.some((item: { id: string }) => item.id === espresso.id)).toBe(false);
  });
});
