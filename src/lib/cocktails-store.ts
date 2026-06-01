import LZString from "lz-string";
import { SEED_COCKTAILS } from "./moodtail-data";

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

export interface Cocktail {
  id: number;
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
  createdAt: string;
}

const KEY = "vibetail-cocktails";

function read(): Cocktail[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Seed first visit
  const seeded: Cocktail[] = SEED_COCKTAILS.map((c, i) => ({
    ...c,
    id: 1000 + i,
    createdAt: new Date(Date.now() - i * 1000 * 60 * 60 * 6).toISOString(),
  }));
  localStorage.setItem(KEY, JSON.stringify(seeded));
  return seeded;
}

function write(list: Cocktail[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function listCocktails(): Cocktail[] {
  return read().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function getCocktail(id: number): Cocktail | null {
  return read().find((c) => c.id === id) ?? null;
}

export function updateCocktailImage(id: number, imageData: string): void {
  const list = read();
  const idx = list.findIndex((c) => c.id === id);
  if (idx === -1) return;
  list[idx] = { ...list[idx], imageData };
  write(list);
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function createCocktail(input: {
  mood: string;
  selectedFlavors: string[];
  customPreference: string;
  photoIngredients?: string[] | null;
}): Cocktail {
  const list = read();
  const seed = SEED_COCKTAILS[hash(input.mood + input.selectedFlavors.join(",")) % SEED_COCKTAILS.length];
  const id = Date.now();
  const next: Cocktail = {
    ...seed,
    id,
    originalMood: input.mood || seed.originalMood,
    selectedFlavors: input.selectedFlavors.length ? input.selectedFlavors : seed.selectedFlavors,
    customPreference: input.customPreference || seed.customPreference,
    flavorProfile: (input.selectedFlavors.length ? input.selectedFlavors.join(", ") : seed.flavorProfile),
    ingredients: input.photoIngredients && input.photoIngredients.length
      ? [...input.photoIngredients.map((i) => `A splash of ${i}`), ...seed.ingredients.slice(0, 2)]
      : seed.ingredients,
    createdAt: new Date().toISOString(),
  };
  list.push(next);
  write(list);
  return next;
}
