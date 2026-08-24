import type { HttpVenueManagementClient } from "../../clients/http-venue-management-client.js";
import { UNTITLED_MENU_NAME, clearMenuDraft, draftToDrinkInputs, readMenuDraft } from "../../lib/menu-draft.js";

/**
 * Finishes a /for-bars draft that was parked while the owner signed in.
 *
 * Both landing pages after sign-in call this: an owner who had to create a
 * venue lands on setup, one who already had a venue lands on the dashboard.
 * Returns whether a menu was actually created, so the caller can send the
 * owner to see it.
 */
export function importPendingMenuDraft(client: HttpVenueManagementClient): Promise<boolean> {
  // The session cache makes admin pages re-render with a fresh client while
  // the first import is still in flight; sharing the promise keeps a second
  // effect run from importing the same draft twice.
  inFlight ??= runImport(client).finally(() => { inFlight = null; });
  return inFlight;
}

let inFlight: Promise<boolean> | null = null;

async function runImport(client: HttpVenueManagementClient): Promise<boolean> {
  const draft = readMenuDraft();
  if (!draft?.pendingImport) return false;
  const drinks = draftToDrinkInputs(draft.items);
  if (drinks.length === 0) {
    // Nothing importable left in it; drop it so this does not retry forever.
    clearMenuDraft();
    return false;
  }
  await client.importScannedMenu({ name: UNTITLED_MENU_NAME, drinks });
  clearMenuDraft();
  return true;
}
