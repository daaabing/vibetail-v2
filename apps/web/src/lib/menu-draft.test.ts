import { describe, expect, it } from "vitest";
import {
  clearMenuDraft,
  draftToDrinkInputs,
  readMenuDraft,
  saveMenuDraft,
  type MenuDraftItem,
} from "./menu-draft.js";

const DRAFT_KEY = "vibetail.menuDraft";

function fakeStorage(initial?: string) {
  const cell: { value: string | null } = { value: initial ?? null };
  return {
    cell,
    getItem: (key: string) => (key === DRAFT_KEY ? cell.value : null),
    setItem: (key: string, value: string) => { if (key === DRAFT_KEY) cell.value = value; },
    removeItem: (key: string) => { if (key === DRAFT_KEY) cell.value = null; },
  };
}

const items: MenuDraftItem[] = [
  { name: "House Negroni", description: "Gin, sweet vermouth, bitter aperitivo.", tones: ["bitter", "boozy"] },
  { name: "Yuzu Highball", description: "Toki whisky, yuzu, soda.", tones: ["citrusy"] },
];

describe("menu draft storage", () => {
  it("survives a round trip with the pending-import flag", () => {
    const storage = fakeStorage();
    saveMenuDraft(items, true, storage);
    expect(readMenuDraft(storage)).toMatchObject({ pendingImport: true, items });
  });

  it("clears the parked draft", () => {
    const storage = fakeStorage();
    saveMenuDraft(items, true, storage);
    clearMenuDraft(storage);
    expect(readMenuDraft(storage)).toBeNull();
  });

  it("treats a missing flag as nothing to import", () => {
    // A draft written before the handover existed must not trigger an import.
    const storage = fakeStorage(JSON.stringify({ savedAt: "2026-01-01T00:00:00.000Z", items }));
    expect(readMenuDraft(storage)?.pendingImport).toBe(false);
  });

  it("fails closed on unreadable or misshapen storage", () => {
    expect(readMenuDraft(fakeStorage("not json"))).toBeNull();
    expect(readMenuDraft(fakeStorage('"a string"'))).toBeNull();
    expect(readMenuDraft(fakeStorage(JSON.stringify({ savedAt: "x" })))).toBeNull();
    expect(readMenuDraft(fakeStorage())).toBeNull();
  });

  it("drops individual items that are not shaped like drafts", () => {
    const storage = fakeStorage(JSON.stringify({
      savedAt: "2026-01-01T00:00:00.000Z",
      pendingImport: true,
      items: [items[0], { name: "No tones" }, { name: 7, description: "", tones: [] }],
    }));
    expect(readMenuDraft(storage)?.items).toEqual([items[0]]);
  });
});

describe("draft to drink inputs", () => {
  it("carries names, descriptions and tones across", () => {
    expect(draftToDrinkInputs(items)).toEqual([
      { name: "House Negroni", description: "Gin, sweet vermouth, bitter aperitivo.", price: null, imageUrl: null, ingredients: [], flavorTags: ["bitter", "boozy"], allergens: [], baseSpirit: null, strength: null, recommendationNote: null },
      { name: "Yuzu Highball", description: "Toki whisky, yuzu, soda.", price: null, imageUrl: null, ingredients: [], flavorTags: ["citrusy"], allergens: [], baseSpirit: null, strength: null, recommendationNote: null },
    ]);
  });

  it("drops nameless rows the API would reject", () => {
    // "+ Add an item" seeds an empty row; one blank must not fail the import.
    expect(draftToDrinkInputs([...items, { name: "   ", description: "orphan", tones: [] }])).toHaveLength(2);
    expect(draftToDrinkInputs([{ name: "", description: "", tones: [] }])).toEqual([]);
  });

  it("trims the name and empties a blank description to null", () => {
    expect(draftToDrinkInputs([{ name: "  Spritz  ", description: "   ", tones: [] }])).toMatchObject([
      { name: "Spritz", description: null },
    ]);
  });
});
