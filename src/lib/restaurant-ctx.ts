// Tracks whether the user is currently inside a restaurant flow,
// so the gallery can preserve the context when navigating to a saved cocktail.
const KEY = "vibetail.restaurantCtx";

export function setRestaurantCtx(id: string) {
  try { sessionStorage.setItem(KEY, id); } catch {}
}

export function getRestaurantCtx(): string | null {
  try { return sessionStorage.getItem(KEY); } catch { return null; }
}

export function clearRestaurantCtx() {
  try { sessionStorage.removeItem(KEY); } catch {}
}
