import { describe, expect, it } from "vitest";
import { matchRestaurantRoute, resolveAppRoute } from "./App.js";

describe("restaurant route", () => {
  it("matches the public merchant/menu path", () => {
    expect(matchRestaurantRoute("/m/double-chicken-please/main")).toEqual({
      merchantSlug: "double-chicken-please",
      menuSlug: "main",
    });
    expect(matchRestaurantRoute("/unrelated")).toBeNull();
  });
});

describe("platform routes", () => {
  it.each([
    ["/", { kind: "landing" }],
    ["/match", { kind: "match" }],
    ["/restaurants", { kind: "restaurants" }],
    ["/restaurants/nightjar-demo", { kind: "restaurant_detail", merchantSlug: "nightjar-demo" }],
    ["/manage", { kind: "management" }],
    ["/for-bars", { kind: "for_bars" }],
    ["/manage/fixture-double-chicken-demo", { kind: "management", privateToken: "fixture-double-chicken-demo" }],
  ])("resolves %s", (path, expected) => expect(resolveAppRoute(path)).toEqual(expected));

  it("returns a real 404 state for unknown paths", () => {
    expect(resolveAppRoute("/nope")).toEqual({ kind: "not_found" });
  });
});
