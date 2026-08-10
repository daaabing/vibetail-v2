import { describe, expect, it } from "vitest";
import {
  agentApprovalRequestSchema,
  globalMatchResultSchema,
  managedMenuItemSchema,
  modelMatchSelectionSchema,
  restaurantMenuItemSchema,
  restaurantPreferencesSchema,
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

describe("restaurant contracts", () => {
  it("accepts a canonical active menu item", () => {
    expect(restaurantMenuItemSchema.parse(item)).toEqual(item);
  });

  it("does not expose hidden as a public availability status", () => {
    expect(() => restaurantMenuItemSchema.parse({ ...item, availabilityStatus: "hidden" })).toThrow();
  });

  it("requires at least one preference signal", () => {
    expect(() => restaurantPreferencesSchema.parse({ flavors: [] })).toThrow();
    expect(restaurantPreferencesSchema.parse({ mood: "quiet celebration" }).locale).toBe("en");
  });

  it("limits model output to an item id and explanation", () => {
    const parsed = modelMatchSelectionSchema.strict().parse({
      matchedItemId: item.id,
      whyThisMatch: "It matches the requested bright, celebratory mood.",
    });
    expect(Object.keys(parsed)).toEqual(["matchedItemId", "whyThisMatch"]);
  });

  it("requires a canonical deep link on global results", () => {
    expect(globalMatchResultSchema.parse({
      restaurant: { id: item.menuId, slug: "nightjar-demo", name: "Nightjar", shortIntro: null, logoUrl: null, coverImageUrl: null },
      menu: { id: item.menuId, slug: "cocktails", name: "Cocktails" }, item,
      whyThisMatch: "Bright.", traceId: "trace", restaurantSpecificUrl: "/m/nightjar-demo/cocktails",
    }).restaurantSpecificUrl).toBe("/m/nightjar-demo/cocktails");
  });

  it("keeps hidden available only inside management contracts", () => {
    expect(managedMenuItemSchema.parse({ ...item, availabilityStatus: "hidden" }).availabilityStatus).toBe("hidden");
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
