// Tashi Baijiu signature cocktails — provided by the Tashi brand.
// Used as references when the user picks "Tashi" as the base spirit.
// The AI may flex names, taste notes, vibes and descriptions, but should
// keep the recipe in the spirit of the reference, and we attach the
// brand-provided illustration to the result card.

import redTibet from "@/assets/tashi/red-tibet.png.asset.json";
import tashiSunset from "@/assets/tashi/tashi-sunset.png.asset.json";
import lhasaTwilight from "@/assets/tashi/lhasa-twilight.png.asset.json";
import tashirita from "@/assets/tashi/tashirita.png.asset.json";
import everestMist from "@/assets/tashi/everest-mist.png.asset.json";
import potalaBreeze from "@/assets/tashi/potala-breeze.png.asset.json";
import himalayanHorizon from "@/assets/tashi/himalayan-horizon.png.asset.json";
import tibetanDreamin from "@/assets/tashi/tibetan-dreamin.png.asset.json";
import theYak from "@/assets/tashi/the-yak.png.asset.json";

export interface TashiRecipe {
  key: string;
  name: string; // brand-given name (reference only — AI may rename)
  vibe: string; // brand-given short story (reference only)
  ingredients: string[]; // reference recipe — AI may adapt
  recipe: string; // reference steps — AI may adapt
  imageUrl: string; // brand-provided illustration shown on the card
  flavorTags: string[]; // rough flavor profile to help matching
}

export const TASHI_RECIPES: TashiRecipe[] = [
  {
    key: "red-tibet",
    name: "Red Tibet",
    vibe: "Born beneath prayer flags dancing in crimson wind — saffron, goji and pomegranate weave warmth and reverence into every sip. Bold, rebellious, ancient.",
    ingredients: [
      "1 oz Tashi Baijiu",
      "2 oz Red Bull",
      "2 oz pomegranate juice",
      "Saffron flowers & goji berries to garnish",
    ],
    recipe:
      "Build over ice in a highball glass.\nAdd Tashi Baijiu, pomegranate juice, then top with Red Bull.\nStir gently to combine.\nGarnish with saffron threads and a few goji berries.",
    imageUrl: redTibet.url,
    flavorTags: ["bold", "fruity", "energetic", "spiced"],
  },
  {
    key: "tashi-sunset",
    name: "Tashi Sunset",
    vibe: "Sunset behind the Himalayas in a glass — blush-hued and golden, the warmth of farewell and the hope of reunion.",
    ingredients: [
      "1 oz Tashi Baijiu",
      "0.5 oz grenadine syrup",
      "4 oz orange juice",
      "Cherry & orange slice to garnish",
    ],
    recipe:
      "Fill a tall glass with ice.\nPour Tashi Baijiu and orange juice over the ice.\nSlowly drizzle grenadine down the side so it settles at the bottom for a sunset gradient.\nGarnish with a cherry and an orange slice.",
    imageUrl: tashiSunset.url,
    flavorTags: ["sweet", "fruity", "citrus", "mellow"],
  },
  {
    key: "lhasa-twilight",
    name: "Lhasa Twilight",
    vibe: "When Lhasa folds into twilight, the sky blushes like it remembers something sweet. Smoky, serene, laced with mystery.",
    ingredients: [
      "2 oz Tashi Baijiu",
      "1.5 oz cream of coconut",
      "1.5 oz pineapple juice",
      "0.5 oz lemonade",
      "Pineapple wedge & pineapple leaf to garnish",
    ],
    recipe:
      "Add all ingredients to a blender with a cup of ice.\nBlend until smooth and frothy.\nPour into a hurricane or stemmed tropical glass.\nGarnish with a pineapple wedge and leaf.",
    imageUrl: lhasaTwilight.url,
    flavorTags: ["tropical", "creamy", "sweet", "smoky"],
  },
  {
    key: "tashirita",
    name: "Tashirita",
    vibe: "East meets fiesta. Bright, bold, and not afraid to dance on the table — said to cure altitude sickness AND heartbreak.",
    ingredients: [
      "2 oz Tashi Baijiu",
      "0.5 oz orange liqueur",
      "1 oz lime juice",
      "0.5 oz agave syrup",
      "Lime wheel & salted rim to garnish",
    ],
    recipe:
      "Rim a margarita glass with salt.\nAdd all ingredients to a blender with ice.\nBlend until slushy.\nPour into the prepared glass and garnish with a lime wheel.",
    imageUrl: tashirita.url,
    flavorTags: ["sour", "citrus", "refreshing", "tart"],
  },
  {
    key: "everest-mist",
    name: "Everest Mist",
    vibe: "A pilgrimage in a glass — crowned with shaved ice like snow on a sacred peak. Cool, clear, and slow as an ascent.",
    ingredients: [
      "1 oz Tashi Baijiu",
      "0.5 oz elderflower syrup",
      "1 oz kiwi liqueur",
      "4 oz sparkling water",
      "Shaved ice on top & kiwi slice to garnish",
    ],
    recipe:
      "Build Tashi Baijiu, elderflower syrup and kiwi liqueur in a tall glass over ice.\nTop with sparkling water and stir gently once.\nCrown with a mound of shaved ice.\nGarnish with a kiwi slice.",
    imageUrl: everestMist.url,
    flavorTags: ["fresh", "floral", "fizzy", "herbal"],
  },
  {
    key: "potala-breeze",
    name: "Potala Breeze",
    vibe: "Wind whispering through palace corridors — smooth, layered, ancient charm. Light on the lips, heavy on the mystique.",
    ingredients: [
      "1 oz Tashi Baijiu",
      "2 oz blue curaçao",
      "2 oz apple juice",
      "2 oz pineapple juice",
      "0.25 oz blueberry syrup",
      "Blueberries & cocktail umbrella to garnish",
    ],
    recipe:
      "Add all ingredients to a blender with ice.\nBlend until smooth and frosty.\nPour into a stemmed coupe or hurricane glass.\nGarnish with blueberries and a small cocktail umbrella.",
    imageUrl: potalaBreeze.url,
    flavorTags: ["tropical", "fruity", "sweet", "refreshing"],
  },
  {
    key: "himalayan-horizon",
    name: "Himalayan Horizon",
    vibe: "Sunrise on the rooftop of the world — a golden gradient of awakening. The promise of a thousand new beginnings.",
    ingredients: [
      "1 oz Tashi Baijiu",
      "0.5 oz butterfly pea flower syrup",
      "0.5 oz lime juice",
      "4 oz Sprite",
      "Violets & hibiscus to garnish",
    ],
    recipe:
      "Pour Tashi Baijiu and butterfly pea syrup into a tall glass over ice.\nAdd lime juice and top with Sprite to trigger the color shift.\nStir gently once to layer the gradient.\nGarnish with edible violets and hibiscus.",
    imageUrl: himalayanHorizon.url,
    flavorTags: ["floral", "citrus", "fizzy", "delicate"],
  },
  {
    key: "tibetan-dreamin",
    name: "Tibetan Dreamin",
    vibe: "A whispered wish, a half-remembered dream — pink-hued escape from the weight of the world. A lullaby in liquid form.",
    ingredients: [
      "1 oz Tashi Baijiu",
      "1.5 oz Martini & Rossi Rosato vermouth",
      "0.5 oz strawberry puree",
      "4 oz ginger ale",
      "2 dashes rhubarb bitters",
      "Cotton candy to garnish",
    ],
    recipe:
      "Build Tashi Baijiu, vermouth, strawberry puree and bitters in a tall glass over ice.\nTop with ginger ale and stir gently.\nCrown with a cloud of cotton candy just before serving.",
    imageUrl: tibetanDreamin.url,
    flavorTags: ["sweet", "floral", "dreamy", "fruity"],
  },
  {
    key: "the-yak",
    name: "The Yak",
    vibe: "Stubborn, bold, unexpectedly smooth — an ode to the unglamorous hero of the Himalayas. Kicks like a mountain gale.",
    ingredients: [
      "1 oz Tashi Baijiu",
      "4 oz ginger beer",
      "0.5 oz lime juice",
      "Lime wheel & mint leaf to garnish",
    ],
    recipe:
      "Fill a copper mug with ice.\nAdd Tashi Baijiu and lime juice.\nTop with ginger beer and stir briefly.\nGarnish with a lime wheel and a mint sprig.",
    imageUrl: theYak.url,
    flavorTags: ["spicy", "refreshing", "citrus", "warming"],
  },
];

/** Pick a Tashi reference recipe loosely matched to user's flavor tags + mood. */
export function pickTashiRecipe(opts: { selectedFlavors?: string[]; mood?: string }): TashiRecipe {
  const flavors = (opts.selectedFlavors ?? []).map((f) => f.toLowerCase());
  const moodText = (opts.mood ?? "").toLowerCase();

  let best: TashiRecipe = TASHI_RECIPES[0];
  let bestScore = -1;
  for (const r of TASHI_RECIPES) {
    let score = 0;
    for (const tag of r.flavorTags) {
      if (flavors.some((f) => f.includes(tag) || tag.includes(f))) score += 2;
      if (moodText.includes(tag)) score += 1;
    }
    // small random jitter so identical scores don't always pick the first one
    score += Math.random();
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}
