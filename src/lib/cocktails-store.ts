import LZString from "lz-string";
import { supabase } from "@/integrations/supabase/client";

export interface Cocktail {
  id: number;
  publicId?: string;
  cocktailName: string;
  originalMood: string;
  selectedFlavors: string[];
  customPreference: string;
  flavorProfile: string;
  tastesLike: string;
  ingredients: string[];
  recipe: string;
  roast: string;
  category: string;
  imageData?: string | null;
  imageUrl?: string | null;
  lang?: "zh" | "en";
  createdAt: string;
  userId?: string | null;
  // Optional: present when the drink is matched from a real bar menu (e.g. DCP)
  matchedFromMenu?: boolean;
  restaurantName?: string | null;
  menuSection?: string | null;
  menuPrice?: string | null;
  whyThisMatch?: string | null;
  // The actual menu item name to order (may differ from the generated vibe name).
  menuItemName?: string | null;
  // The uploaded photo of the actual menu item (shown on the back with "Order this").
  menuItemImageUrl?: string | null;
  // The actual menu item's own description (used to inform watercolor generation).
  menuItemDescription?: string | null;
  // The actual menu item's ingredient list (used to preserve real drink identity in the illustration).
  menuItemIngredients?: string[] | null;
  // A link to the merchant's full menu (image or PDF) shown as "View full menu".
  fullMenuUrl?: string | null;
  fullMenuType?: "pdf" | "image" | null;
}

export interface GeneratedCocktailFields {
  cocktailName: string;
  tastesLike: string;
  flavorProfile: string;
  ingredients: string[];
  recipe: string;
  roast: string;
  category: string;
}

// Row shape returned by Supabase (snake_case).
type Row = {
  id: number;
  user_id: string | null;
  public_id: string;
  cocktail_name: string;
  original_mood: string;
  selected_flavors: string[];
  custom_preference: string;
  flavor_profile: string;
  tastes_like: string;
  ingredients: string[];
  recipe: string;
  roast: string;
  category: string;
  image_data: string | null;
  image_url: string | null;
  lang: string;
  created_at: string;
};

function fromRow(r: Row): Cocktail {
  return {
    id: r.id,
    publicId: r.public_id,
    cocktailName: r.cocktail_name,
    originalMood: r.original_mood,
    selectedFlavors: r.selected_flavors ?? [],
    customPreference: r.custom_preference,
    flavorProfile: r.flavor_profile,
    tastesLike: r.tastes_like,
    ingredients: r.ingredients ?? [],
    recipe: r.recipe,
    roast: r.roast,
    category: r.category,
    imageData: r.image_data,
    imageUrl: r.image_url,
    lang: r.lang === "zh" || r.lang === "en" ? r.lang : "en",
    createdAt: r.created_at,
    userId: r.user_id,
  };
}

export function encodeCocktailToHash(c: Cocktail): string {
  const minimal = { ...c, imageData: null };
  return LZString.compressToEncodedURIComponent(JSON.stringify(minimal));
}

export function decodeCocktailFromHash(hash: string): Cocktail | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(hash);
    if (!json) return null;
    return JSON.parse(json) as Cocktail;
  } catch {
    return null;
  }
}

/** List cocktails belonging to the currently signed-in user. Returns []
 * when no user is signed in. */
export async function listMyCocktails(): Promise<Cocktail[]> {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user.id;
  if (!uid) return [];
  const { data, error } = await supabase
    .from("cocktails")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    return [];
  }
  return (data as Row[]).map(fromRow);
}

export async function getCocktail(id: string | number): Promise<Cocktail | null> {
  if (id === undefined || id === null) return null;
  const key = String(id).trim();
  if (!key) return null;
  // Try public_id (short slug) first; fall back to numeric id for legacy links.
  let q = supabase.from("cocktails").select("*");
  if (/^\d+$/.test(key)) {
    const { data } = await q.or(`public_id.eq.${key},id.eq.${key}`).maybeSingle();
    return data ? fromRow(data as Row) : null;
  }
  const { data, error } = await q.eq("public_id", key).maybeSingle();
  if (error || !data) return null;
  return fromRow(data as Row);
}

/** Persist an already-generated cocktail preview to the signed-in user's bar. */
export async function saveCocktailFromPreview(
  c: Cocktail,
  imageData?: string | null,
): Promise<Cocktail> {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user.id;
  if (!uid) throw new Error("NOT_SIGNED_IN");
  const payload = {
    user_id: uid,
    cocktail_name: c.cocktailName,
    original_mood: c.originalMood,
    selected_flavors: c.selectedFlavors,
    custom_preference: c.customPreference,
    flavor_profile: c.flavorProfile,
    tastes_like: c.tastesLike,
    ingredients: c.ingredients,
    recipe: c.recipe,
    roast: c.roast,
    category: c.category,
    image_url: c.imageUrl ?? null,
    image_data: imageData ?? c.imageData ?? null,
    lang: c.lang ?? "en",
  };
  const { data, error } = await supabase.from("cocktails").insert(payload).select("*").single();
  if (error || !data) throw error ?? new Error("insert failed");
  return fromRow(data as Row);
}

export async function updateCocktailImage(id: number, imageData: string): Promise<void> {
  const { error } = await supabase.from("cocktails").update({ image_data: imageData }).eq("id", id);
  if (error) console.error("updateCocktailImage", error);
}

export async function createCocktail(input: {
  mood: string;
  selectedFlavors: string[];
  customPreference: string;
  photoIngredients?: string[] | null;
  generated?: GeneratedCocktailFields | null;
  imageUrl?: string | null;
  lang?: "zh" | "en";
}): Promise<Cocktail> {
  const { data: sess } = await supabase.auth.getSession();
  const uid = sess.session?.user.id;
  if (!uid) {
    throw new Error("NOT_SIGNED_IN");
  }
  const g = input.generated;
  const payload = {
    user_id: uid,
    cocktail_name: g?.cocktailName ?? "Untitled",
    original_mood: input.mood ?? "",
    selected_flavors: input.selectedFlavors ?? [],
    custom_preference: input.customPreference ?? "",
    flavor_profile: g?.flavorProfile ?? input.selectedFlavors?.join(", ") ?? "",
    tastes_like: g?.tastesLike ?? "",
    ingredients: g?.ingredients ?? [],
    recipe: g?.recipe ?? "",
    roast: g?.roast ?? "",
    category: g?.category ?? "",
    image_url: input.imageUrl ?? null,
    lang: input.lang ?? "en",
  };
  const { data, error } = await supabase.from("cocktails").insert(payload).select("*").single();
  if (error || !data) throw error ?? new Error("insert failed");
  return fromRow(data as Row);
}
