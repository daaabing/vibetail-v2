import { describe, expect, it } from "vitest";
import { toLegacyResultViewModel } from "./legacy-result.js";

describe("toLegacyResultViewModel", () => {
  it("maps canonical facts into the temporary UI without inventing fields", () => {
    const view = toLegacyResultViewModel({
      restaurant: { id: "11111111-1111-4111-8111-111111111111", slug: "test", name: "Test", shortIntro: null, logoUrl: null, coverImageUrl: null },
      menu: { id: "22222222-2222-4222-8222-222222222222", slug: "main", name: "Main" },
      item: {
        id: "33333333-3333-4333-8333-333333333333", menuId: "22222222-2222-4222-8222-222222222222",
        name: "Canonical", description: "From DB", price: "$18", imageUrl: null, alcoholic: true,
        baseSpirit: "gin", flavorTags: ["fresh"], moodTags: ["calm"], ingredients: ["gin"], allergens: [],
        recommendationPriority: 1, availabilityStatus: "active", section: "Drinks", sortOrder: 1,
      },
      whyThisMatch: "Provider explanation", traceId: "trace",
    });
    expect(view).toEqual({
      itemName: "Canonical", description: "From DB", price: "$18", section: "Drinks", baseSpirit: "gin",
      flavorTags: ["fresh"], ingredients: ["gin"], explanation: "Provider explanation",
    });
  });
});
