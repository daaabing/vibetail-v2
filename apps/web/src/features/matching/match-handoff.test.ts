import { describe, expect, it } from "vitest";
import { parseMatchHandoff } from "./match-handoff.js";

const now = 1_800_000_000_000;
const path = "/m/nightjar-demo/cocktails";
const handoff = {
  createdAt: now - 1_000,
  path,
  preferences: { mood: "quietly curious", flavors: ["fresh"], alcoholPreference: "either", locale: "en" },
  result: {
    venue: { id: "11111111-1111-4111-8111-111111111111", slug: "nightjar-demo", name: "Nightjar Demo", shortIntro: null, logoUrl: null, coverImageUrl: null },
    menu: { id: "22222222-2222-4222-8222-222222222222", slug: "cocktails", name: "Cocktails" },
    item: {
      id: "33333333-3333-4333-8333-333333333333", menuId: "22222222-2222-4222-8222-222222222222", name: "The Sparkler", description: "Bright and fresh", price: "$16", imageUrl: null,
      alcoholic: true, baseSpirit: "Gin", flavorTags: ["fresh"], moodTags: ["curious"], ingredients: ["gin", "citrus"], allergens: [], recommendationPriority: 1, availabilityStatus: "active", section: "Cocktails", sortOrder: 1,
    },
    whyThisMatch: "Fresh enough for the mood, with just enough lift.",
    traceId: "trace-1",
  },
};

describe("global-to-venue match handoff", () => {
  it("accepts a fresh validated result for the same venue menu", () => {
    expect(parseMatchHandoff(handoff, path, now)).toMatchObject({ result: { item: { name: "The Sparkler" } } });
  });

  it("fails closed for another route, expired data, or an invalid result", () => {
    expect(parseMatchHandoff(handoff, "/m/another/menu", now)).toBeUndefined();
    expect(parseMatchHandoff(handoff, path, now + 31 * 60 * 1_000)).toBeUndefined();
    expect(parseMatchHandoff({ ...handoff, result: { ...handoff.result, item: { ...handoff.result.item, availabilityStatus: "hidden" } } }, path, now)).toBeUndefined();
  });
});
