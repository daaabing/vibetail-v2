import { createFileRoute } from "@tanstack/react-router";

interface GenInput {
  mood?: string;
  selectedFlavors?: string[];
  customPreference?: string;
  photoIngredients?: string[] | null;
  lang?: "zh" | "en";
  tashiReference?: {
    name: string;
    vibe: string;
    ingredients: string[];
    recipe: string;
  } | null;
}

interface GeneratedCocktail {
  cocktailName: string;
  tastesLike: string;
  flavorProfile: string;
  ingredients: string[];
  recipe: string;
  roast: string;
  category: "builder-brain" | "love-drunk" | "heartbreak" | "chaos" | "late-night";
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    cocktailName: {
      type: "string",
      description:
        "Creative, playful 2-4 word cocktail name that riffs on the user's vibe. Can pun off classic cocktails (e.g. 'Merge Conflict Mojito', 'Situationship Sour').",
    },
    tastesLike: {
      type: "string",
      description:
        "A single evocative sentence (max ~30 words) describing how the drink tastes AND feels emotionally, tied to the user's mood.",
    },
    flavorProfile: {
      type: "string",
      description: "3-4 comma-separated taste adjectives (e.g. 'bitter, smoky, refreshing').",
    },
    ingredients: {
      type: "array",
      minItems: 4,
      maxItems: 6,
      items: { type: "string" },
      description:
        "REAL, measurable bar ingredients with quantities in oz/ml/dashes. Must be a drink an actual bartender could build. Example: '2 oz blanco tequila', '0.75 oz fresh lime juice', '0.5 oz agave syrup', '2 dashes orange bitters'. NO metaphorical ingredients like 'a splash of panic'.",
    },
    recipe: {
      type: "string",
      description:
        "Real bartender instructions: 3-5 short steps separated by newlines. Use real techniques (shake with ice, double strain, build in glass, stir, muddle, express peel). Mention glassware and garnish. Example: 'Rim a coupe with salt.\\nShake all ingredients with ice for 12 seconds.\\nDouble strain into the prepared coupe.\\nGarnish with a lime wheel.'",
    },
    roast: {
      type: "string",
      description: "One witty, slightly cutting one-liner that roasts the user's vibe in 12 words or fewer.",
    },
    category: {
      type: "string",
      enum: ["builder-brain", "love-drunk", "heartbreak", "chaos", "late-night"],
      description: "Pick the closest emotional category for this vibe.",
    },
  },
  required: ["cocktailName", "tastesLike", "flavorProfile", "ingredients", "recipe", "roast", "category"],
} as const;

function buildUserPrompt(input: GenInput): string {
  const mood = input.mood?.trim() || "(no mood given)";
  const flavors = (input.selectedFlavors ?? []).join(", ") || "(no flavor tags)";
  const pref = input.customPreference?.trim() || "(no custom preference)";
  const photo = input.photoIngredients?.length
    ? `Ingredients the user has on hand (try to incorporate at least one if it fits): ${input.photoIngredients.join(", ")}`
    : "No ingredients photo provided.";
  const isZh = input.lang === "zh";
  const langRule = isZh
    ? `OUTPUT LANGUAGE: Simplified Chinese (简体中文). ALL string fields (cocktailName, tastesLike, flavorProfile, ingredients, recipe, roast) MUST be written in Simplified Chinese. Ingredient measurements use 盎司/毫升/滴/吧勺. The 'category' enum stays in English. Keep witty Chinese tone — don't translate stiffly.`
    : `OUTPUT LANGUAGE: English.`;
  return [
    langRule,
    ``,
    `User mood / vibe: ${mood}`,
    `Flavor tags they picked: ${flavors}`,
    `Custom preference: ${pref}`,
    photo,
    ``,
    `Design ONE creative-but-makeable cocktail that captures this vibe.`,
    `Hard rules:`,
    `- Ingredients must be real bar ingredients with real measurements (oz, ml, dashes, barspoons).`,
    `- The recipe must be executable by an actual home bartender — no metaphors, no "splash of panic".`,
    `- It can riff on a classic (sour, spritz, martini, highball, daiquiri, negroni, old fashioned) or be original, but the technique must be real.`,
    `- The cocktailName, tastesLike, and roast SHOULD be witty and tied to the user's vibe — that's where the personality lives.`,
    `- Keep it balanced (acid + sweet + spirit) so it would actually taste good.`,
  ].join("\n");
}

export const Route = createFileRoute("/api/generate-cocktail")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        let input: GenInput;
        try {
          input = (await request.json()) as GenInput;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content:
                  "You are a world-class bartender AND a witty copywriter. You invent original cocktails that are creative on the outside (name, vibe, roast) but technically real and balanced on the inside (real ingredients, real measurements, real technique). You always respond with valid JSON matching the provided schema.",
              },
              { role: "user", content: buildUserPrompt(input) },
            ],
            response_format: {
              type: "json_schema",
              json_schema: { name: "cocktail", strict: true, schema: SCHEMA },
            },
          }),
          signal: request.signal,
        });

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Upstream error", { status: upstream.status });
        }

        const json = (await upstream.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const content = json.choices?.[0]?.message?.content;
        if (!content) return new Response("No content", { status: 502 });

        let parsed: GeneratedCocktail;
        try {
          parsed = JSON.parse(content) as GeneratedCocktail;
        } catch {
          return new Response("Bad JSON from model", { status: 502 });
        }

        return new Response(JSON.stringify(parsed), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
