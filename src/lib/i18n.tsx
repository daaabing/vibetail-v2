"use client";

import { createContext, useContext, type ReactNode } from "react";

export type Lang = "en";

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextType>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export const translations: Record<Lang, Record<string, string>> = {
  en: {
    // Landing
    "landing.tagline": "Every mood deserves the perfect pour.",
    "landing.subtitle": "Turn your current vibe into a cocktail.",
    "landing.cta.mix": "Check My Vibe",
    "landing.cta.bar": "View the Vibe Bar",
    "lang.toggle": "中",
    // Nav
    "nav.vibeCheck": "Vibe Check",
    "nav.vibeBar": "Vibe Bar",
    // Step 3 — Ingredients photo
    "ingredients.title": "What's in your fridge?",
    "ingredients.subtitle":
      "Upload your ingredients, and we'll mix something using only what you have. Or skip this step.",
    "ingredients.upload": "Upload Photo",
    "ingredients.skip": "Skip",
    "ingredients.analyzing": "Analyzing ingredients…",
    "ingredients.detected": "Detected ingredients",
    "ingredients.detected.continue": "Mix with these ingredients",
    "ingredients.retry": "Try another photo",
    "ingredients.invalid":
      "We couldn't mix a drink from this photo yet 🍸 Please upload a photo with at least one drinkable liquid, like alcohol, juice, soda, coffee, tea, milk, sparkling water, or water.",
    "ingredients.step": "STEP 03 / 03",
    // Mood Input
    "mood.title": "What's your current vibe?",
    "mood.subtitle": "Pick one or type your own.",
    "mood.chips.label": "Quick vibes",
    "mood.divider": "OR TYPE YOUR OWN",
    "mood.surprise": "SURPRISE ME",
    "mood.next": "Next — Choose Flavor",
    "mood.exit": "EXIT LAB",
    "mood.back": "BACK",
    "mood.step1": "STEP 01 / 02",
    "mood.step2": "STEP 02 / 02",
    // Flavor
    "flavor.title": "What should it taste like?",
    "flavor.subtitle": "Optional — skip and we'll choose for you.",
    "flavor.chips.label": "Flavor modifiers (optional)",
    "flavor.custom.label": "Any flavor reference? (optional)",
    "flavor.run": "Run the Vibe Check",
    "flavor.loading": "Reading your vibe...",
    // Result
    "result.home": "HOME",
    "result.checked": "VIBE CHECKED ✓",
    "result.distilling": "CRAFTING THE MOOD…",
    "result.tap": "TAP TO FLIP",
    "result.tap.menu": "TAP TO SEE THE RECOMMENDED DRINKS",
    "result.original": "ORIGINAL VIBE",
    "result.tasting": "TASTING NOTES",
    "result.ingredients": "INGREDIENTS",
    "result.ingredients.ref": "for reference",
    "result.ingredients.bar": "Final interpretation & execution reserved by the bar",
    "result.howToMake": "HOW TO MAKE",
    "result.diagnosis": "VIBE DIAGNOSIS",

    "result.save": "Save Card",
    "result.saving": "Saving…",
    "result.share": "Share",
    "result.print": "Print",
    "result.copied": "Link Copied ✓",
    "result.another": "Check Another Vibe",
    // Gallery
    "gallery.home": "HOME",
    "gallery.title": "Vibe Bar",
    "gallery.addVibe": "+ VIBE",
    "gallery.empty": "No vibes yet. Go mix the first one.",
    "gallery.emptyBtn": "Check My Vibe",
    "gallery.prev": "← Prev",
    "gallery.next": "Next →",
    "gallery.ago": "ago",
    // Merchant landing
    "merchant.ageGate.title": "Are you 21 or over?",
    "merchant.ageGate.desc":
      "This menu contains alcoholic beverages. Please confirm before continuing.",
    "merchant.ageGate.yes": "Yes, I'm 21+",
    "merchant.ageGate.no": "No",
    "merchant.intro.fallback":
      "Tell us your vibe. We'll match you to one drink from tonight's menu — and tell you why.",
    "merchant.cta.match": "Match my vibe →",
    "merchant.noGames": "No games enabled for this menu yet.",
    "merchant.curatedBy": "Menu curated by {name}",
  },
};

/**
 * The app ships in English. The provider is kept so components can go on
 * asking for copy through `t()` and so the API's `lang` field still has a
 * value, but there is no longer anything to switch between.
 */
export function LangProvider({ children }: { children: ReactNode }) {
  const value: LangContextType = {
    lang: "en",
    setLang: () => {},
    t: (key: string) => translations.en[key] ?? key,
  };
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}
