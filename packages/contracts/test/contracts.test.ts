import { describe, expect, it } from "vitest";
import {
  agentApprovalRequestSchema,
  createVenueInputSchema,
  globalMatchResultSchema,
  managedMenuSchema,
  managedMenuItemSchema,
  matchSelectionSchemaFor,
  modelMatchSelectionSchema,
  MAX_ALLOWLISTED_MATCH_IDS,
  updateMenuInputSchema,
  updateVenueProfileInputSchema,
  venueErrorCodeSchema,
  venueMatchResultSchema,
  venueMenuItemSchema,
  venuePreferencesSchema,
} from "../src/index.js";

const item = {
  id: "10000000-0000-4000-8000-000000000001",
  menuId: "10000000-0000-4000-8000-000000000002",
  name: "Citrus Highball",
  description: "Bright and sparkling",
  price: null,
  imageUrl: null,
  alcoholic: true,
  baseSpirit: "gin",
  flavorTags: ["citrusy"],
  moodTags: ["celebrating"],
  ingredients: ["gin", "citrus", "soda"],
  allergens: [],
  recommendationPriority: 0,
  availabilityStatus: "active" as const,
  section: "Highballs",
  sortOrder: 10,
};

describe("venue contracts", () => {
  it("accepts a canonical active menu item", () => {
    expect(venueMenuItemSchema.parse(item)).toEqual(item);
  });

  it("does not expose hidden as a public availability status", () => {
    expect(() => venueMenuItemSchema.parse({ ...item, availabilityStatus: "hidden" })).toThrow();
  });

  it("requires at least one preference signal", () => {
    expect(() => venuePreferencesSchema.parse({ flavors: [] })).toThrow();
    expect(venuePreferencesSchema.parse({ mood: "quiet celebration" }).mood).toBe("quiet celebration");
  });

  const modelCopy = {
    vibeName: "Paper Moon",
    tastesLike: "Citrus and basil over a long, cold pour.",
    flavorProfile: "bright, herbal, crisp",
    whyThisMatch: "It matches the requested bright, celebratory mood.",
    roast: "Celebrating alone again, are we.",
  };

  it("limits model output to an item id and its own copy", () => {
    const parsed = modelMatchSelectionSchema.strict().parse({ matchedItemId: item.id, ...modelCopy });
    expect(Object.keys(parsed)).toEqual([
      "matchedItemId", "vibeName", "tastesLike", "flavorProfile", "whyThisMatch", "roast",
    ]);
  });

  it("rejects model-supplied menu facts", () => {
    expect(() => modelMatchSelectionSchema.strict().parse({
      matchedItemId: item.id, ...modelCopy, price: "$18", ingredients: ["gin"],
    })).toThrow();
  });

  it("pins matchedItemId to the candidate allowlist when the menu is small enough", () => {
    const allowed = matchSelectionSchemaFor([item.id]);
    expect(allowed.parse({ matchedItemId: item.id, ...modelCopy }).matchedItemId).toBe(item.id);
    expect(() => allowed.parse({ matchedItemId: "10000000-0000-4000-8000-00000000000f", ...modelCopy }))
      .toThrow();
  });

  it("falls back to a plain uuid when the candidate list exceeds the enum budget", () => {
    const ids = Array.from({ length: MAX_ALLOWLISTED_MATCH_IDS + 1 }, (_, index) =>
      `10000000-0000-4000-8000-${String(index).padStart(12, "0")}`);
    const unlisted = "20000000-0000-4000-8000-000000000000";
    expect(matchSelectionSchemaFor(ids).parse({ matchedItemId: unlisted, ...modelCopy }).matchedItemId)
      .toBe(unlisted);
  });

  it("requires a canonical deep link on global results", () => {
    expect(globalMatchResultSchema.parse({
      venue: { id: item.menuId, slug: "nightjar-demo", name: "Nightjar", shortIntro: null, logoUrl: null, coverImageUrl: null },
      menu: { id: item.menuId, slug: "cocktails", name: "Cocktails" }, item,
      ...modelCopy, traceId: "trace", venueSpecificUrl: "/m/nightjar-demo/cocktails",
    }).venueSpecificUrl).toBe("/m/nightjar-demo/cocktails");
  });

  it("keeps hidden available only inside management contracts", () => {
    expect(managedMenuItemSchema.parse({ ...item, availabilityStatus: "hidden" }).availabilityStatus).toBe("hidden");
  });

  it("treats matchId as optional on match results", () => {
    const base = {
      venue: { id: item.menuId, slug: "nightjar-demo", name: "Nightjar", shortIntro: null, logoUrl: null, coverImageUrl: null },
      menu: { id: item.menuId, slug: "cocktails", name: "Cocktails" }, item,
      ...modelCopy, traceId: "trace",
    };
    expect(venueMatchResultSchema.parse(base).matchId).toBeUndefined();
    expect(venueMatchResultSchema.parse({ ...base, matchId: "10000000-0000-4000-8000-000000000009" }).matchId)
      .toBe("10000000-0000-4000-8000-000000000009");
  });

  it("recognizes the feedback and current-menu error codes", () => {
    expect(venueErrorCodeSchema.parse("MATCH_NOT_FOUND")).toBe("MATCH_NOT_FOUND");
    expect(venueErrorCodeSchema.parse("NO_PUBLISHED_MENU")).toBe("NO_PUBLISHED_MENU");
  });

  it("accepts archived managed menus but rejects archived as an update input", () => {
    const menu = {
      id: item.menuId,
      slug: "old-menu",
      name: "Old Menu",
      status: "archived" as const,
      publishedVersionId: null,
      shortIntro: null,
      coverImageUrl: null,
      items: [],
    };
    expect(managedMenuSchema.parse(menu).status).toBe("archived");
    expect(() => updateMenuInputSchema.parse({ name: "x", slug: "old-menu", shortIntro: null, status: "archived" })).toThrow();
  });

  it("defaults a missing venue intro to null and normalises blank ones", () => {
    // Clients that predate the intro field keep working against the same route.
    expect(createVenueInputSchema.parse({ name: "Ego", address: "1 Test Street" }).shortIntro).toBeNull();
    expect(createVenueInputSchema.parse({ name: "Ego", address: "1 Test Street", shortIntro: " " }).shortIntro).toBeNull();
    expect(updateVenueProfileInputSchema.parse({
      name: "Ego", address: "1 Test Street", venueType: "cocktail_bar", shortIntro: "  Natural wine and highballs.  ",
    }).shortIntro).toBe("Natural wine and highballs.");
  });
});

describe("agent contracts", () => {
  it("requires a stable approval idempotency key", () => {
    const result = agentApprovalRequestSchema.safeParse({
      id: "10000000-0000-4000-8000-000000000003",
      agentRunId: "10000000-0000-4000-8000-000000000004",
      status: "pending",
      action: "publish preview",
      reason: "External side effect requires confirmation",
      riskLevel: "high",
      approvalVersion: 1,
      idempotencyKey: "run-4:approval:1",
      requestedAt: "2026-08-09T18:00:00.000Z",
      decidedAt: null,
      decidedBy: null,
    });
    expect(result.success).toBe(true);
  });
});
