import { createFileRoute, Link } from "@tanstack/react-router";
import VibetailLogo from "@/components/moodtail/VibetailLogo";

const TITLE = "Mood-Based Cocktail Recipes — 12 Vibes, 12 Drinks | Vibetail";
const DESC = "A curated guide of 12 cocktail recipes matched to common moods — relaxed, energetic, romantic, focused, and more. Free recipes plus an AI cocktail generator.";
const URL = "https://vibetail.com/guides/mood-cocktail-recipes";

export const Route = createFileRoute("/guides/mood-cocktail-recipes")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "article" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: TITLE,
          description: DESC,
          url: URL,
          author: { "@type": "Organization", name: "Vibetail" },
          publisher: { "@type": "Organization", name: "Vibetail" },
        }),
      },
    ],
  }),
  component: GuidePage,
});

type MoodRecipe = {
  mood: string;
  name: string;
  why: string;
  ingredients: string[];
  method: string;
};

const RECIPES: MoodRecipe[] = [
  {
    mood: "Relaxed",
    name: "Chamomile Highball",
    why: "Chamomile-honey and long soda soothe without dulling — a low-ABV wind-down.",
    ingredients: ["1.5 oz chamomile-infused gin", "0.5 oz honey syrup", "0.5 oz lemon juice", "Soda water", "Lemon twist"],
    method: "Shake gin, honey, lemon with ice. Strain over fresh ice in a highball. Top with soda. Garnish with lemon twist.",
  },
  {
    mood: "Energetic",
    name: "Espresso Paloma",
    why: "Grapefruit brightness and a shot of cold brew hit like a second wind.",
    ingredients: ["1.5 oz blanco tequila", "1 oz cold brew", "1 oz grapefruit juice", "0.5 oz lime", "0.25 oz agave", "Grapefruit soda"],
    method: "Shake everything except soda hard. Strain over ice in a salted rocks glass. Top with grapefruit soda.",
  },
  {
    mood: "Romantic",
    name: "Rose French 75",
    why: "Rose, gin, and Champagne — floral, celebratory, dressed for candlelight.",
    ingredients: ["1 oz gin", "0.5 oz rose syrup", "0.5 oz lemon juice", "Champagne"],
    method: "Shake gin, rose syrup, lemon with ice. Strain into a chilled flute. Top with Champagne.",
  },
  {
    mood: "Focused",
    name: "Matcha Gimlet",
    why: "L-theanine + gin's botanicals sharpen without the crash.",
    ingredients: ["2 oz gin", "0.5 oz matcha syrup (1:1 sugar water whisked with 1 tsp matcha)", "0.75 oz lime juice"],
    method: "Shake all with ice until frothy. Double-strain into a chilled coupe.",
  },
  {
    mood: "Melancholy",
    name: "Smoke & Fig Old Fashioned",
    why: "Peated whisky and dried fig turn heaviness into something worth sitting with.",
    ingredients: ["2 oz bourbon", "0.25 oz fig jam", "2 dashes Angostura", "1 bar spoon peated Scotch (float)", "Orange peel"],
    method: "Stir bourbon, fig jam, bitters with ice until cold. Strain over a large cube. Float Scotch. Express orange peel.",
  },
  {
    mood: "Playful",
    name: "Watermelon Margarita Pop",
    why: "Watermelon + Tajín + a lime disc — bright, silly, made to share.",
    ingredients: ["1.5 oz blanco tequila", "1.5 oz fresh watermelon juice", "0.75 oz lime juice", "0.5 oz agave", "Tajín rim"],
    method: "Shake with ice. Strain into a Tajín-rimmed rocks glass over fresh ice. Garnish with a lime wheel.",
  },
  {
    mood: "Nostalgic",
    name: "Cherry Coke Highball",
    why: "Rye, cherry, and cola — a grown-up version of a childhood memory.",
    ingredients: ["1.5 oz rye whiskey", "0.25 oz Luxardo cherry liqueur", "Chilled cola", "Brandied cherry"],
    method: "Build rye and Luxardo over ice in a highball. Top with cola. Drop in a brandied cherry.",
  },
  {
    mood: "Adventurous",
    name: "Mezcal Mule",
    why: "Smoke, ginger heat, and lime — a Moscow Mule that took a wrong turn on purpose.",
    ingredients: ["1.5 oz mezcal", "0.75 oz lime juice", "0.5 oz honey syrup", "Ginger beer", "Candied ginger"],
    method: "Shake mezcal, lime, honey with ice. Strain into a copper mug over fresh ice. Top with ginger beer.",
  },
  {
    mood: "Cozy",
    name: "Spiced Apple Toddy",
    why: "Warm apple, clove, and rum — a mug that feels like a blanket.",
    ingredients: ["1.5 oz aged rum", "3 oz warm apple cider", "0.5 oz lemon juice", "0.25 oz maple syrup", "Cinnamon stick", "3 cloves"],
    method: "Warm cider with cloves. Pour into a mug over rum, lemon, maple. Stir with cinnamon stick.",
  },
  {
    mood: "Confident",
    name: "Negroni Sbagliato",
    why: "Bitter, red, sparkling — the drink you order without asking for the menu.",
    ingredients: ["1 oz Campari", "1 oz sweet vermouth", "1 oz Prosecco", "Orange half-wheel"],
    method: "Build Campari and vermouth over a large cube. Top with Prosecco. Garnish with orange.",
  },
  {
    mood: "Curious",
    name: "Cucumber-Basil Collins",
    why: "Herbaceous, cool, unfamiliar — a drink that keeps you tasting.",
    ingredients: ["2 oz gin", "0.75 oz lemon juice", "0.5 oz simple syrup", "3 cucumber slices", "4 basil leaves", "Soda water"],
    method: "Muddle cucumber and basil in a shaker. Add gin, lemon, syrup, ice. Shake, strain over ice, top with soda.",
  },
  {
    mood: "Celebratory",
    name: "Passionfruit Champagne Spritz",
    why: "Tropical, sparkling, generous — this drink is a toast on sight.",
    ingredients: ["1 oz passionfruit purée", "0.5 oz lime juice", "0.25 oz simple syrup", "3 oz Champagne", "Passionfruit half"],
    method: "Stir purée, lime, syrup in a flute. Top with Champagne. Float passionfruit half on top.",
  },
];

function GuidePage() {
  return (
    <div className="w-full md:max-w-3xl md:mx-auto px-5 pt-6 pb-28 md:pb-12">
      <div className="flex items-center justify-between mb-6">
        <Link to="/" className="text-xs flex items-center gap-1.5" style={{ color: "var(--app-text-secondary)" }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M15.75 19.5L8.25 12l7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Home
        </Link>
        <VibetailLogo size={40} />
      </div>

      <article className="space-y-6">
        <header className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--app-text-muted)", fontFamily: "var(--font-body)" }}>
            Vibetail Guide
          </p>
          <h1 className="text-4xl font-semibold leading-tight" style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)" }}>
            Mood-Based Cocktail Recipes
          </h1>
          <p className="text-base italic leading-relaxed" style={{ fontFamily: "var(--font-heading)", color: "var(--app-text-secondary)" }}>
            12 vibes, 12 cocktails. A hand-picked guide of drinks that match how you feel — plus an AI generator that mixes something new from a mood you type in.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)" }}>
            How to use this guide
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--app-text-secondary)" }}>
            Scroll the list, find the mood that lands closest to yours, and follow the recipe. If nothing quite matches, tell Vibetail what you're feeling in your own words and our AI bartender will mix a bespoke cocktail — name, recipe, tasting notes, and all.
          </p>
          <Link
            to="/mood-input"
            className="inline-flex items-center gap-2 mt-1 px-5 py-2.5 rounded text-sm font-semibold tracking-wider text-white"
            style={{
              background: "linear-gradient(135deg, #C2410C 0%, #E0533C 50%, #C2410C 100%)",
              boxShadow: "2px 3px 12px rgba(194,65,12,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            Generate a cocktail from your vibe →
          </Link>
        </section>

        <section className="space-y-6">
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)" }}>
            12 mood-based cocktail recipes
          </h2>

          {RECIPES.map((r) => (
            <article key={r.mood} className="glass-card rounded-xl p-5 space-y-3">
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <h3 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)" }}>
                  {r.name}
                </h3>
                <span className="text-[10px] uppercase tracking-[0.25em]" style={{ color: "var(--app-primary)", fontFamily: "var(--font-body)" }}>
                  {r.mood}
                </span>
              </div>
              <p className="text-sm italic" style={{ fontFamily: "var(--font-heading)", color: "var(--app-text-secondary)" }}>
                {r.why}
              </p>
              <div>
                <h4 className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--app-text-muted)", fontFamily: "var(--font-body)" }}>
                  Ingredients
                </h4>
                <ul className="list-disc list-inside text-sm space-y-0.5" style={{ color: "var(--app-text)" }}>
                  {r.ingredients.map((i) => <li key={i}>{i}</li>)}
                </ul>
              </div>
              <div>
                <h4 className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: "var(--app-text-muted)", fontFamily: "var(--font-body)" }}>
                  Method
                </h4>
                <p className="text-sm leading-relaxed" style={{ color: "var(--app-text-secondary)" }}>{r.method}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="space-y-3 pt-4">
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)" }}>
            Didn't see your mood?
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "var(--app-text-secondary)" }}>
            Moods don't fit into 12 boxes. Vibetail's AI cocktail generator takes any vibe — a sentence, a lyric, a memory — and mixes a personalized recipe with a name, ingredients, method, and tasting notes.
          </p>
          <Link
            to="/mood-input"
            className="inline-flex items-center gap-2 mt-1 px-5 py-2.5 rounded text-sm font-semibold tracking-wider text-white"
            style={{
              background: "linear-gradient(135deg, #C2410C 0%, #E0533C 50%, #C2410C 100%)",
              boxShadow: "2px 3px 12px rgba(194,65,12,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            Try the AI cocktail generator →
          </Link>
        </section>
      </article>
    </div>
  );
}
