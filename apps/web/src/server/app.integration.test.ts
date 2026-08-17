import { randomUUID } from "node:crypto";
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
  SupabaseManagementRepository,
  SupabaseVenueManagementRepository,
  SupabaseVenueMediaStorage,
  SupabaseVenueRepository,
  UnavailableVenueManagementService,
} from "@vibetail/venue-core";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createWebApp } from "./app.js";

const NO_AUTH = { provider: "none", supabaseUrl: null, supabasePublishableKey: null } as const;
const APP_URL = "http://127.0.0.1:3000";

// Seeded by scripts/generate-seed.mjs (fixtures/venue/menus.json) via the
// vitest globalSetup's `supabase db reset`. These rows are read-only for tests.
const SEED_VENUE_SLUGS = ["double-chicken-please", "nightjar-demo", "vibetail-taproom"];

// Every test that writes uses uniquely named "webint-*" records: one `db reset`
// serves the whole run, so writes must never pollute the seeded read-only
// assertions above, and unique names avoid slug dedup surprises (journey-bar-2)
// across suites and watch-mode reruns.
const RUN_ID = randomUUID().slice(0, 8);

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set; the vitest globalSetup (test/global-db-setup.ts) injects it.`);
  }
  return value;
}

/** Local Supabase stack connection injected by test/global-db-setup.ts. */
function supabaseConfig() {
  return {
    url: requiredEnv("SUPABASE_URL"),
    publishableKey: requiredEnv("SUPABASE_PUBLISHABLE_KEY"),
    serviceRoleKey: requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

// Mirrors createWebDependencies (dependencies.ts): public reads through the
// publishable key, management through the service-role key, media in the
// private merchant-menus bucket. Only renderQrSvg is stubbed so the QR
// assertion can see the encoded URL.
function app(venueProvider?: ModelProvider) {
  const { url, publishableKey, serviceRoleKey } = supabaseConfig();
  const repository = new SupabaseVenueRepository({ url, publishableKey });
  const provider = new DeterministicMatchingProvider();
  return createWebApp({
    venueService: new DefaultVenueService(repository, venueProvider ?? provider),
    managementService: new DefaultManagementService(
      new SupabaseManagementRepository({ url, serviceRoleKey }),
    ),
    venueManagementService: new DefaultVenueManagementService(
      new SupabaseVenueManagementRepository({ url, serviceRoleKey }),
      {
        appUrl: APP_URL,
        drinkInfoProvider: provider,
        menuPhotoScanProvider: new DeterministicMenuPhotoScanProvider(),
        drinkPhotoProvider: new OriginalDrinkPhotoProvider(),
        mediaStorage: new SupabaseVenueMediaStorage({ url, serviceRoleKey }),
        renderQrSvg: async (text) => `<svg data-url="${text}"></svg>`,
      },
    ),
    authConfig: NO_AUTH,
    checkReadiness: async () => {
      try {
        const scopes = await repository.listPublishedVenueMenus();
        return [{
          name: "venue_repository",
          ready: true,
          detail: `supabase reachable; ${scopes.length} published menu(s) visible`,
        }];
      } catch {
        return [{ name: "venue_repository", ready: false, detail: "supabase query failed" }];
      }
    },
    testFrontend: true,
  });
}

/** Signs up a fresh webint-* account and creates its venue. */
async function createWebintVenue(instance: ReturnType<typeof app>, name: string) {
  const login = await request(instance).post("/v1/venue/session").send({ name }).expect(201);
  const auth = { Authorization: `Bearer ${login.body.token as string}` };
  const created = await request(instance).post("/v1/venue").set(auth)
    .send({ name, address: "1 Webint Way", venueType: "cocktail_bar" }).expect(201);
  return { auth, venueSlug: created.body.venue.slug as string };
}

function drinkPayload(name: string) {
  return {
    name,
    description: "Webint integration drink.",
    price: "$10",
    imageUrl: null,
    ingredients: ["soda"],
    flavorTags: ["fresh"],
    allergens: [],
    baseSpirit: null,
    strength: "light",
    recommendationNote: null,
  };
}

describe("venue HTTP slice (local supabase)", () => {
  it("reports liveness and dependency readiness", async () => {
    expect((await request(app()).get("/health").expect(200)).body.status).toBe("ok");
    expect((await request(app()).get("/ready").expect(200)).body).toMatchObject({
      status: "ready",
      checks: [{
        name: "venue_repository",
        ready: true,
        detail: expect.stringMatching(/^supabase reachable; \d+ published menu\(s\) visible$/),
      }],
    });
  });

  it("serves the publishable auth config and no secrets", async () => {
    const body = (await request(app()).get("/v1/config").expect(200)).body;
    expect(body).toEqual({
      auth: { provider: "none", supabaseUrl: null, supabasePublishableKey: null },
    });
  });

  it("fails readiness closed when a required dependency is unavailable", async () => {
    const { url, publishableKey, serviceRoleKey } = supabaseConfig();
    const unavailable = createWebApp({
      venueService: new DefaultVenueService(
        new SupabaseVenueRepository({ url, publishableKey }),
        new DeterministicMatchingProvider(),
      ),
      managementService: new DefaultManagementService(
        new SupabaseManagementRepository({ url, serviceRoleKey }),
      ),
      venueManagementService: new UnavailableVenueManagementService(),
      authConfig: NO_AUTH,
      checkReadiness: async () => [{ name: "venue_repository", ready: false, detail: "supabase query failed" }],
      testFrontend: true,
    });
    expect((await request(unavailable).get("/ready").expect(503)).body.status).toBe("not_ready");
  });

  it("serves the landing SPA route and the seeded venue directory in slug order", async () => {
    expect((await request(app()).get("/").expect(200)).text).toContain('<div id="root"></div>');
    const directory = await request(app()).get("/v1/venues").expect(200);
    const entries = directory.body as Array<{ venue: { slug: string }; menus: Array<{ slug: string }> }>;
    // Other integration suites may publish their own webint-* venues within the
    // same database lifetime, so assert on the seeded subset. Relative order is
    // the deterministic slug order added to listPublishedVenueMenus.
    const seeded = entries.filter((entry) => SEED_VENUE_SLUGS.includes(entry.venue.slug));
    expect(seeded.map((entry) => entry.venue.slug)).toEqual(SEED_VENUE_SLUGS);
    expect(seeded.flatMap((entry) => entry.menus.map((menu) => menu.slug)))
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

  it("loads the seeded menu without hidden items", async () => {
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
    // RLS hides inactive merchants and unpublished menus from the publishable
    // key, so the finer MERCHANT_INACTIVE / MENU_UNPUBLISHED details are
    // unreachable here and both collapse into not-found.
    ["/v1/venues/inactive-venue/menus/main", "MERCHANT_NOT_FOUND"],
    ["/v1/venues/double-chicken-please/menus/unpublished", "MENU_NOT_FOUND"],
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

  it("authorizes management and round-trips an availability change", async () => {
    const instance = app();
    const auth = { Authorization: "Bearer fixture-double-chicken-demo" };
    await request(instance).get("/v1/management/merchant").expect(401);
    const managed = await request(instance).get("/v1/management/merchant").set(auth).expect(200);
    expect(managed.body.slug).toBe("double-chicken-please");

    const itemId = "33333333-3333-4333-8333-333333333331";
    await request(instance).patch(`/v1/management/items/${itemId}/availability`)
      .set(auth).send({ availabilityStatus: "sold_out" }).expect(200);
    const soldOut = await request(instance).get("/v1/venues/double-chicken-please/menus/main").expect(200);
    expect(soldOut.body.items.find((item: { id: string }) => item.id === itemId))
      .toMatchObject({ availabilityStatus: "sold_out" });

    // Restore the seeded availability: the database lives for the whole run,
    // so later read-only assertions (here and in other suites) rely on it.
    await request(instance).patch(`/v1/management/items/${itemId}/availability`)
      .set(auth).send({ availabilityStatus: "active" }).expect(200);
    const restored = await request(instance).get("/v1/venues/double-chicken-please/menus/main").expect(200);
    expect(restored.body.items.find((item: { id: string }) => item.id === itemId))
      .toMatchObject({ availabilityStatus: "active" });
  });

  it("runs the venue backend journey from login to dashboard", async () => {
    const instance = app();
    const venueName = `Webint Journey Bar ${RUN_ID}`;
    const venueSlug = `webint-journey-bar-${RUN_ID}`;

    await request(instance).get("/v1/venue/drinks").expect(401);
    const login = await request(instance).post("/v1/venue/session").send({ name: venueName }).expect(201);
    expect(login.body.session.venue).toBeNull();
    const auth = { Authorization: `Bearer ${login.body.token as string}` };

    const created = await request(instance).post("/v1/venue").set(auth)
      .send({ name: venueName, address: "42 Test Ave", venueType: "cocktail_bar" }).expect(201);
    expect(created.body.venue).toMatchObject({ slug: venueSlug, address: "42 Test Ave" });

    await request(instance).get(`/v1/venues/${venueSlug}/current-menu`).expect(404)
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
    expect(qr.body.consumerUrl).toBe(`${APP_URL}/m/${venueSlug}`);
    expect(qr.body.qrSvg).toContain(venueSlug);

    const current = await request(instance).get(`/v1/venues/${venueSlug}/current-menu`).expect(200);
    expect(current.body.slug).toBe("second-menu");
    expect(current.body.items).toHaveLength(1);

    await request(instance).post("/v1/events/menu-views")
      .send({ merchantSlug: venueSlug, menuId: current.body.id }).expect(204);

    const match = await request(instance).post(`/v1/venues/${venueSlug}/menus/second-menu/match`)
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
    const displayName = `Webint Solo ${RUN_ID}`;
    const login = await request(app()).post("/v1/venue/session").send({ name: displayName }).expect(201);
    expect(login.body).toMatchObject({
      token: expect.any(String),
      session: { account: { name: displayName.toLowerCase(), displayName }, venue: null },
    });
    await request(app()).post("/v1/venue/session").send({ name: "   " }).expect(400);
  });

  it("links the seeded Demo Bar account to its venue and drink library", async () => {
    // Read-only pass over seeded rows: account -> merchant linkage plus the
    // created_at ordering of the seeded taproom drinks.
    const instance = app();
    const login = await request(instance).post("/v1/venue/session").send({ name: "Demo Bar" }).expect(201);
    expect(login.body.session.venue.slug).toBe("vibetail-taproom");
    const auth = { Authorization: `Bearer ${login.body.token as string}` };
    const drinks = await request(instance).get("/v1/venue/drinks").set(auth).expect(200);
    const names = drinks.body.map((entry: { name: string }) => entry.name);
    // The seed staggers created_at into the past, so seeded drinks always sort
    // before anything appended later in the run.
    expect(names.slice(0, 4)).toEqual([
      "Smoked Pear Old Fashioned", "Yuzu Garden Spritz", "Velvet Espresso Martini", "Sunset Cooler",
    ]);
  });

  it("scans a menu photo, imports its drinks, and round-trips a drink photo through storage", async () => {
    const instance = app();
    const { auth } = await createWebintVenue(instance, `Webint Scan Bar ${RUN_ID}`);
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
    // imageUrl is a signed URL served by the local Supabase storage API;
    // fetching it proves the bytes really landed in the private bucket.
    const stored = await fetch(prepared.body.imageUrl as string);
    expect(stored.status).toBe(200);
    expect(Buffer.from(await stored.arrayBuffer()).toString("utf8")).toBe("fixture-image");
  });

  it("deletes drinks with menu cleanup through the HTTP surface", async () => {
    const instance = app();
    const { auth, venueSlug } = await createWebintVenue(instance, `Webint Cleanup Bar ${RUN_ID}`);

    const doomed = await request(instance).post("/v1/venue/drinks").set(auth)
      .send(drinkPayload("Webint Espresso Martini")).expect(201);
    const keeper = await request(instance).post("/v1/venue/drinks").set(auth)
      .send(drinkPayload("Webint Keeper Fizz")).expect(201);

    const menu = await request(instance).post("/v1/venue/menus").set(auth)
      .send({ name: "Cleanup Menu", drinkIds: [doomed.body.id, keeper.body.id] }).expect(201);
    await request(instance).post("/v1/venue/menus").set(auth)
      .send({ name: "Cleanup Draft", drinkIds: [doomed.body.id] }).expect(201);
    await request(instance).post(`/v1/venue/menus/${menu.body.id as string}/publish`).set(auth).expect(200);

    const usage = await request(instance)
      .get(`/v1/venue/drinks/${doomed.body.id as string}/usage`).set(auth).expect(200);
    expect(usage.body.menus).toHaveLength(2);

    const deleted = await request(instance)
      .delete(`/v1/venue/drinks/${doomed.body.id as string}`).set(auth).expect(200);
    expect(deleted.body.removedFromMenus).toBe(2);

    const publicMenu = await request(instance).get(`/v1/venues/${venueSlug}/current-menu`).expect(200);
    expect(publicMenu.body.items.map((item: { id: string }) => item.id)).toEqual([keeper.body.id]);
  });
});
