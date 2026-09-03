import { describe, expect, it } from "vitest";
import { matchVenueRoute, resolveAppRoute } from "./App.js";

describe("venue route", () => {
  it("matches the public merchant/menu path", () => {
    expect(matchVenueRoute("/m/double-chicken-please/main")).toEqual({
      merchantSlug: "double-chicken-please",
      menuSlug: "main",
    });
    expect(matchVenueRoute("/unrelated")).toBeNull();
  });
});

describe("platform routes", () => {
  it.each([
    ["/", { kind: "landing" }],
    ["/app", { kind: "mobile_app" }],
    ["/app/", { kind: "mobile_app" }],
    ["/match", { kind: "match" }],
    ["/venues", { kind: "venues" }],
    ["/signin", { kind: "signin" }],
    ["/venues/nightjar-demo", { kind: "venue_detail", merchantSlug: "nightjar-demo" }],
    ["/manage", { kind: "redirect", to: "/venue" }],
    ["/for-bars", { kind: "for_bars" }],
    ["/manage/fixture-double-chicken-demo", { kind: "management", privateToken: "fixture-double-chicken-demo" }],
    ["/restaurants", { kind: "redirect", to: "/venues" }],
    ["/restaurants/nightjar-demo", { kind: "redirect", to: "/venues/nightjar-demo" }],
    ["/venue", { kind: "venue_admin", section: "login" }],
    ["/venue/setup", { kind: "venue_admin", section: "setup" }],
    ["/venue/dashboard", { kind: "venue_admin", section: "dashboard" }],
    ["/venue/drinks", { kind: "venue_admin", section: "drinks" }],
    ["/venue/menus", { kind: "venue_admin", section: "menus" }],
    ["/venue/qr", { kind: "venue_admin", section: "qr" }],
    ["/m/vibetail-taproom", { kind: "venue_current", merchantSlug: "vibetail-taproom" }],
    ["/m/vibetail-taproom/", { kind: "venue_current", merchantSlug: "vibetail-taproom" }],
  ])("resolves %s", (path, expected) => expect(resolveAppRoute(path)).toEqual(expected));

  it("keeps unknown venue admin sections as 404", () => {
    expect(resolveAppRoute("/venue/unknown")).toEqual({ kind: "not_found" });
  });

  it("returns a real 404 state for unknown paths", () => {
    expect(resolveAppRoute("/nope")).toEqual({ kind: "not_found" });
  });
});
