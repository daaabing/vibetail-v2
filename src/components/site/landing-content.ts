/**
 * All marketing copy for the public landing page.
 *
 * ⚠️ BEFORE LAUNCH — replace the placeholder entries:
 *    · TEAM[].name / TEAM[].bio      → real people
 *    · PARTNERS[] beyond the first two → real venues & brands
 *    · STATS[] numbers                → real figures
 * Everything else is derived from what the product actually does today.
 */

import type { Lang } from "@/lib/i18n";

/** Copy is English-only; the wrapper stays so call sites read the same. */
export type Bi = { en: string };

export const pick = (v: Bi, _lang?: Lang) => v.en;

/* ── Identity ─────────────────────────────────────────────────────────── */

export const BRAND = {
  name: "Vibetail",
  wordmark: "Vibetail",
  instagram: "https://instagram.com/vibe.tail",
  handle: "@vibe.tail",
  email: "hello@vibetail.com",
  tagline: {
    en: "Every mood deserves the perfect pour.",
  } as Bi,
  oneLiner: {
    en: "Vibetail reads the mood you're actually in and mixes one drink for it — a name, a recipe, a tasting note, and a diagnosis you didn't ask for.",
  } as Bi,
};

/**
 * The hero backdrop. Drop a file in /public and point at it here — it will be
 * desaturated, crushed and grained to sit under the line-work. Leave both
 * empty and the hero renders its own procedural night instead.
 */
export const HERO_MEDIA: { video?: string; poster?: string } = {
  // Extracted from the Collov Labs Figma frame. Swap for film via `video`.
  poster: "/hero.jpg",
};

/** The four the Figma nav carries — everything else is reachable by scroll. */
export const NAV_LINKS: { id: string; label: Bi }[] = [
  { id: "what", label: { en: "What it is" } },
  { id: "how", label: { en: "How it works" } },
  { id: "venues", label: { en: "For bars" } },
  { id: "faq", label: { en: "FAQ" } },
];

/* ── Hero ─────────────────────────────────────────────────────────────── */

export const HERO = {
  eyebrow: { en: "AI Cocktail Atelier — Est. 2025" } as Bi,
  headline: {
    en: ["Tell us how", "you actually", "feel tonight."],
  },
  sub: {
    en: "Five short questions. One bespoke cocktail — named, mixed and diagnosed for the exact mood you walked in with.",
  } as Bi,
  primaryCta: { en: "Mix my drink" } as Bi,
  secondaryCta: { en: "See how it works" } as Bi,
  note: {
    en: "Free · No account needed · 30 seconds",
  } as Bi,
};

/** Marquee of moods that scroll under the hero — the raw material of the app. */
export const HERO_MARQUEE: Bi[] = [
  { en: "Quietly falling apart" },
  { en: "Friday, finally" },
  { en: "Overthinking at 2am" },
  { en: "Flirting with bad ideas" },
  { en: "Doomscrolling" },
  { en: "Pure vibes only" },
  { en: "Out to see the world" },
  { en: "Celebrating something small" },
  { en: "Recovering from yesterday" },
  { en: "Stone-cold clear" },
];

export const STATS: { value: string; label: Bi }[] = [
  { value: "5", label: { en: "questions, one per screen" } },
  { value: "30s", label: { en: "from mood to glass" } },
  { value: "0", label: { en: "cocktail vocabulary required" } },
  { value: "∞", label: { en: "recipes, never repeated" } },
];

/* ── What it is ───────────────────────────────────────────────────────── */

export const WHAT = {
  eyebrow: { en: "( 01 ) What it is" } as Bi,
  headline: {
    en: "A bartender that listens before it pours.",
  } as Bi,
  body: {
    en: "Most drink apps ask what spirit you like. Vibetail starts somewhere more honest: what kind of day you've had. From there it tunes texture, strength and surprise — then writes you a drink that only makes sense tonight.",
  } as Bi,
  points: [
    {
      no: "i",
      title: { en: "Mood first, spirit later" } as Bi,
      body: {
        en: "Pick a vibe from the cloud or type your own sentence. No cocktail vocabulary required.",
      } as Bi,
    },
    {
      no: "ii",
      title: { en: "Tuned by feel" } as Bi,
      body: {
        en: "Three sliders — crisp↔rich, soft↔bold, familiar↔unexpected. Instinct, not ingredients.",
      } as Bi,
    },
    {
      no: "iii",
      title: { en: "A card worth keeping" } as Bi,
      body: {
        en: "Every result is a printable card: name, recipe, tasting note, and one honest line.",
      } as Bi,
    },
    {
      no: "iv",
      title: { en: "Or the real menu" } as Bi,
      body: {
        en: "At a partner bar, the same flow matches you to a drink that's actually on the menu tonight.",
      } as Bi,
    },
  ],
};

/* ── How it works ─────────────────────────────────────────────────────── */

export const HOW = {
  eyebrow: { en: "( 02 ) How it works" } as Bi,
  headline: { en: "Five screens. One question each." } as Bi,
  sub: {
    en: "Nothing is required except the first. Skip everything else and we'll make the call for you.",
  } as Bi,
  steps: [
    {
      no: "01",
      accent: "var(--vermilion)",
      title: { en: "The vibe" } as Bi,
      body: {
        en: "Tap a mood or write your own line. This is the only thing we genuinely need.",
      } as Bi,
    },
    {
      no: "02",
      accent: "var(--marigold)",
      title: { en: "The texture" } as Bi,
      body: {
        en: "Three sliders set how it should feel in the mouth. Leave them centered if you don't care.",
      } as Bi,
    },
    {
      no: "03",
      accent: "var(--olive)",
      title: { en: "The strength" } as Bi,
      body: {
        en: "Slow sip or hit me — plus zero-proof if you only want the ritual.",
      } as Bi,
    },
    {
      no: "04",
      accent: "var(--sky)",
      title: { en: "The base" } as Bi,
      body: {
        en: "Gin, mezcal, sake, nothing at all. Optional — most people skip it.",
      } as Bi,
    },
    {
      no: "05",
      accent: "var(--plum)",
      title: { en: "The notes" } as Bi,
      body: {
        en: "Specific flavors, or a drink you already have in mind. Then we mix.",
      } as Bi,
    },
  ],
};

/* ── Specimen samples (illustrative of the output format) ─────────────── */

export const SPECIMENS: {
  no: string;
  accent: string;
  name: Bi;
  mood: Bi;
  note: Bi;
  tags: Bi[];
}[] = [
  {
    no: "07",
    accent: "var(--vermilion)",
    name: { en: "Merge Conflict Mojito" },
    mood: { en: "debugging at 2am with false confidence" },
    note: {
      en: "Three broken APIs, one working button, and the dangerous belief that everything ships on time.",
    },
    tags: [{ en: "bitter" }, { en: "chaotic" }, { en: "refreshing" }],
  },
  {
    no: "12",
    accent: "var(--marigold)",
    name: { en: "Ship It Spritz" },
    mood: { en: "locked in and held together by vibes" },
    note: {
      en: "Focus music on loop, a Figma tab you haven't touched, and kinetic energy with nowhere to go.",
    },
    tags: [{ en: "refreshing" }, { en: "chaotic" }],
  },
  {
    no: "23",
    accent: "var(--sky)",
    name: { en: "Read Receipt Rickey" },
    mood: { en: "they were last online four hours ago" },
    note: {
      en: "Lime, soda, and the specific silence of a conversation that stopped mid-sentence.",
    },
    tags: [{ en: "citrusy" }, { en: "dry" }],
  },
];

/* ── For venues ───────────────────────────────────────────────────────── */

export const VENUES = {
  eyebrow: { en: "( 06 ) For bars & restaurants" } as Bi,
  headline: {
    en: "Put your own menu behind the vibe.",
  } as Bi,
  body: {
    en: "Run Vibetail on your list. Guests describe their night at the table; we recommend one drink that's actually pourable tonight — and explain, in your voice, why it's that one.",
  } as Bi,
  features: [
    {
      no: "01",
      title: { en: "QR to table" } as Bi,
      body: {
        en: "A single QR opens your branded menu flow. No app, no download, no account.",
      } as Bi,
    },
    {
      no: "02",
      title: { en: "Only what's in stock" } as Bi,
      body: {
        en: "Sold-out items drop out of the matcher automatically. Base spirits follow your list.",
      } as Bi,
    },
    {
      no: "03",
      title: { en: "Reasons, not guesses" } as Bi,
      body: {
        en: "Each match ships with a short 'why this one' the guest can read — and repeat to friends.",
      } as Bi,
    },
    {
      no: "04",
      title: { en: "A card they keep" } as Bi,
      body: {
        en: "Guests save or print a specimen card of their drink, watermarked with your venue.",
      } as Bi,
    },
    {
      no: "05",
      title: { en: "Your own dashboard" } as Bi,
      body: {
        en: "Edit items, sections, availability and intro copy from a private management link.",
      } as Bi,
    },
    {
      no: "06",
      title: { en: "What the room wanted" } as Bi,
      body: {
        en: "See the moods walking through your door and which drinks they resolved to.",
      } as Bi,
    },
  ],
  cta: { en: "Talk to us about your menu" } as Bi,
};

/* ── Partners ─────────────────────────────────────────────────────────── */

export const PARTNERS: { name: string; kind: Bi; note: Bi; live: boolean }[] = [
  {
    name: "Double Chicken Please",
    kind: { en: "Cocktail bar · New York" },
    note: {
      en: "Menu-matching flow live on the main list.",
    },
    live: true,
  },
  {
    name: "Tashi",
    kind: { en: "Highland barley spirit" },
    note: {
      en: "House recipes built into the mixer as a base-spirit option.",
    },
    live: true,
  },
  // ⚠️ Placeholder rows — replace with real partners before launch.
  {
    name: "Your bar here",
    kind: { en: "Cocktail bar" },
    note: { en: "Slots open for the next cohort." },
    live: false,
  },
  {
    name: "Your brand here",
    kind: { en: "Spirit brand" },
    note: { en: "Base-spirit placements available." },
    live: false,
  },
];

/* ── Team ─────────────────────────────────────────────────────────────── */
/** ⚠️ Placeholder people — swap names, bios and initials for the real team. */
export const TEAM: { initials: string; name: string; role: Bi; bio: Bi }[] = [
  {
    initials: "—",
    name: "Your name here",
    role: { en: "Founder · Product" },
    bio: {
      en: "Decides what the app refuses to ask you.",
    },
  },
  {
    initials: "—",
    name: "Your name here",
    role: { en: "Design · Brand" },
    bio: {
      en: "Keeps the paper warm and the type quiet.",
    },
  },
  {
    initials: "—",
    name: "Your name here",
    role: { en: "Engineering" },
    bio: {
      en: "Ships the thing that turns a sentence into a recipe.",
    },
  },
  {
    initials: "—",
    name: "Your name here",
    role: { en: "Bar programme" },
    bio: {
      en: "Makes sure the recipes are drinkable, not just funny.",
    },
  },
];

/* ── Testimonials ─────────────────────────────────────────────────────── */
/** ⚠️ Placeholder quotes — replace with real, attributable feedback. */
export const QUOTES: { quote: Bi; who: Bi }[] = [
  {
    quote: {
      en: "It named my drink after the exact thing I was avoiding thinking about. Rude. Correct.",
    },
    who: { en: "Guest, opening night" },
  },
  {
    quote: {
      en: "Guests stopped asking 'what do you recommend'. They arrive already knowing.",
    },
    who: { en: "Bar manager, partner venue" },
  },
  {
    quote: {
      en: "The card is the souvenir. Half the table printed one.",
    },
    who: { en: "Pop-up host" },
  },
];

/* ── FAQ ──────────────────────────────────────────────────────────────── */

export const FAQ: { q: Bi; a: Bi }[] = [
  {
    q: { en: "Do I need an account?" },
    a: {
      en: "No. Mixing and sharing work as a guest. An account only exists so your drinks are saved to the Vibe Bar across devices.",
    },
  },
  {
    q: { en: "Is it free?" },
    a: {
      en: "The consumer app is free. Venue menu-matching is a paid product — talk to us about your list.",
    },
  },
  {
    q: { en: "Are the recipes actually makeable?" },
    a: {
      en: "Yes — measurements, method and glassware are real. The tasting notes and the diagnosis are where we take liberties.",
    },
  },
  {
    q: { en: "Can I get something without alcohol?" },
    a: {
      en: "Yes. Pick zero-proof at the strength step and the whole recipe is rebuilt around it — not just the spirit removed.",
    },
  },
  {
    q: { en: "What happens to what I type?" },
    a: {
      en: "Your mood text is sent to the model to write the drink, and stored with the drink if you save it. It is never sold, and never attached to your identity in a partner venue's reporting.",
    },
  },
  {
    q: { en: "Do I need to know anything about cocktails?" },
    a: {
      en: "No. Every question is asked in plain language — how the night is going, how you want it to feel — and the technical decisions happen behind the curtain.",
    },
  },
];

/* ── Footer ───────────────────────────────────────────────────────────── */

export const FOOTER_NOTE = {
  en: "Please drink responsibly. Vibetail is for people of legal drinking age in their country. Recipes are suggestions; a real bartender always has the final say.",
} as Bi;
