import { DeterministicMatchingProvider } from "@vibetail/model-providers";
import { DefaultManagementService, DefaultRestaurantService, FixtureRestaurantRepository } from "@vibetail/restaurant-core";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createWebApp } from "./app.js";

function app() {
  const repository = new FixtureRestaurantRepository();
  return createWebApp({
    restaurantService: new DefaultRestaurantService(repository, new DeterministicMatchingProvider({ failureMenuIds: repository.fixture.matchingFailureMenuIds })),
    managementService: new DefaultManagementService(repository),
    dataSource: "fixture",
    testFrontend: true,
  });
}

describe("restaurant HTTP slice", () => {
  it("reports liveness and dependency readiness", async () => {
    expect((await request(app()).get("/health").expect(200)).body.status).toBe("ok");
    expect((await request(app()).get("/ready").expect(200)).body).toMatchObject({
      status: "ready",
      checks: [{ name: "restaurant_repository", ready: true, detail: "fixture" }],
    });
  });

  it("fails readiness closed when a required dependency is unavailable", async () => {
    const repository = new FixtureRestaurantRepository();
    const unavailable = createWebApp({
      restaurantService: new DefaultRestaurantService(repository, new DeterministicMatchingProvider()),
      managementService: new DefaultManagementService(repository),
      dataSource: "fixture",
      checkReadiness: async () => [{ name: "restaurant_repository", ready: false, detail: "unavailable" }],
      testFrontend: true,
    });
    expect((await request(unavailable).get("/ready").expect(503)).body.status).toBe("not_ready");
  });

  it("serves the landing SPA route and active restaurant directory", async () => {
    expect((await request(app()).get("/").expect(200)).text).toContain('<div id="root"></div>');
    const directory = await request(app()).get("/v1/restaurants").expect(200);
    expect(directory.body.map((entry: { restaurant: { slug: string } }) => entry.restaurant.slug)).toEqual([
      "double-chicken-please", "nightjar-demo",
    ]);
  });

  it("completes a global match with a restaurant-specific URL", async () => {
    const response = await request(app()).post("/v1/matches/global").send({
      preferences: { mood: "clear headed", flavors: ["fresh"], alcoholPreference: "non_alcoholic" },
    }).expect(200);
    expect(response.body).toMatchObject({
      restaurant: { slug: "nightjar-demo" }, menu: { slug: "cocktails" },
      item: { availabilityStatus: "active" }, restaurantSpecificUrl: "/m/nightjar-demo/cocktails",
    });
  });

  it("loads the fixture menu without hidden items", async () => {
    const response = await request(app()).get("/v1/restaurants/double-chicken-please/menus/main").expect(200);
    expect(response.body.restaurant.name).toBe("Double Chicken Please");
    expect(response.body.items.map((item: { name: string }) => item.name)).toEqual(["Holy Shishito", "Cuppa Sunshine", "Waldorf Salad"]);
  });

  it("matches from the active allowlist end to end", async () => {
    const response = await request(app())
      .post("/v1/restaurants/double-chicken-please/menus/main/match")
      .send({ preferences: { mood: "adventurous", flavors: ["spicy"], locale: "en" } })
      .expect(200);
    expect(response.body.item).toMatchObject({ name: "Holy Shishito", availabilityStatus: "active" });
    expect(response.body.traceId).toEqual(expect.any(String));
  });

  it.each([
    ["/v1/restaurants/missing/menus/main", "MERCHANT_NOT_FOUND"],
    ["/v1/restaurants/inactive-restaurant/menus/main", "MERCHANT_INACTIVE"],
    ["/v1/restaurants/double-chicken-please/menus/unpublished", "MENU_UNPUBLISHED"],
  ])("returns structured errors for %s", async (url, code) => {
    const response = await request(app()).get(url).expect(404);
    expect(response.body).toMatchObject({ code, retryable: false });
  });

  it("returns a retryable matching provider failure", async () => {
    const response = await request(app())
      .post("/v1/restaurants/double-chicken-please/menus/matching-failure/match")
      .send({ preferences: { mood: "curious" } })
      .expect(503);
    expect(response.body).toMatchObject({ code: "MATCH_PROVIDER_UNAVAILABLE", retryable: true });
  });

  it("serves the restaurant page route", async () => {
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
    const publicMenu = await request(instance).get("/v1/restaurants/double-chicken-please/menus/main").expect(200);
    expect(publicMenu.body.items.find((item: { id: string }) => item.id.endsWith("331"))).toMatchObject({ availabilityStatus: "sold_out" });
  });
});
