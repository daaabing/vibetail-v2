import type { DrinkInput } from "@vibetail/contracts";

/**
 * The menu a bar owner drafts on /for-bars, held on this device until an
 * account exists to attach it to.
 *
 * Saving on the desk is the handover point: a signed-in owner gets the draft
 * imported immediately, while everyone else is sent through sign-in and venue
 * creation first. The draft therefore has to survive a full-page navigation,
 * which is why it lives in localStorage rather than component state, and it
 * carries `pendingImport` so the page the owner lands on afterwards knows
 * there is still work to finish.
 */

const DRAFT_KEY = "vibetail.menuDraft";

/** Menus arrive unnamed; the owner renames them in the backend. */
export const UNTITLED_MENU_NAME = "Untitled menu";

export interface MenuDraftItem {
  name: string;
  description: string;
  tones: string[];
}

export interface MenuDraft {
  savedAt: string;
  items: MenuDraftItem[];
  /** Set when the draft still has to be turned into a menu after sign-in. */
  pendingImport: boolean;
}

export function saveMenuDraft(
  items: MenuDraftItem[],
  pendingImport: boolean,
  storage: Pick<Storage, "setItem"> = window.localStorage,
): void {
  try {
    storage.setItem(DRAFT_KEY, JSON.stringify({
      savedAt: new Date().toISOString(),
      items: items.map((item) => ({ name: item.name, description: item.description, tones: item.tones })),
      pendingImport,
    } satisfies MenuDraft));
  } catch {
    // Private mode — the draft still lives on screen, and a signed-in owner
    // imports straight from component state without reading it back.
  }
}

export function readMenuDraft(storage: Pick<Storage, "getItem"> = window.localStorage): MenuDraft | null {
  let raw: string | null = null;
  try {
    raw = storage.getItem(DRAFT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const value = parsed as Partial<MenuDraft>;
    if (!Array.isArray(value.items)) return null;
    return {
      savedAt: typeof value.savedAt === "string" ? value.savedAt : "",
      items: value.items.filter(isDraftItem),
      pendingImport: value.pendingImport === true,
    };
  } catch {
    // A draft written by an older build, or hand-edited storage.
    return null;
  }
}

export function clearMenuDraft(storage: Pick<Storage, "removeItem"> = window.localStorage): void {
  try {
    storage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore storage failures on cleanup.
  }
}

/**
 * Drops rows the owner left blank — "+ Add an item" seeds an empty one, and
 * the API rejects a nameless drink, which would fail the whole import.
 */
export function draftToDrinkInputs(items: MenuDraftItem[]): DrinkInput[] {
  return items
    .filter((item) => item.name.trim().length > 0)
    .map((item) => ({
      name: item.name.trim(),
      description: item.description.trim() || null,
      price: null,
      imageUrl: null,
      ingredients: [],
      flavorTags: item.tones,
      allergens: [],
      baseSpirit: null,
      strength: null,
      recommendationNote: null,
    }));
}

function isDraftItem(value: unknown): value is MenuDraftItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MenuDraftItem>;
  return typeof item.name === "string"
    && typeof item.description === "string"
    && Array.isArray(item.tones)
    && item.tones.every((tone) => typeof tone === "string");
}
