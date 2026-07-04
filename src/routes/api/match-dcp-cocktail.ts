import { createFileRoute } from "@tanstack/react-router";
import { DCP_MENU } from "@/lib/dcp-menu";

interface MatchInput {
  mood?: string;
  selectedFlavors?: string[];
  customPreference?: string;
  lang?: "zh" | "en";
}

interface MatchedCocktail {
  matchedName: string; // must be one of DCP_MENU names
  tastesLike: string;
  flavorProfile: string;
  whyThisMatch: string; // short reason tied to the user's vibe
  roast: string;
  category: "builder-brain" | "love-drunk" | "heartbreak" | "chaos" | "late-night";
}

const NAMES = DCP_MENU.map((c) => c.name);

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    matchedName: { type: "string", enum: NAMES, description: "Pick EXACTLY ONE cocktail name from the Double Chicken Please menu. Must match one of the provided names verbatim." },
    tastesLike:  { type: "string", description: "One evocative sentence (~30 words) about how this drink tastes AND feels emotionally, tied to the user's vibe." },
    flavorProfile: { type: "string", description: "3-4 comma-separated taste adjectives." },
    whyThisMatch: { type: "string", description: "One short sentence (~25 words) explaining why THIS cocktail from the menu fits the user's vibe. Warm, personal." },
    roast:        { type: "string", description: "One witty, slightly cutting one-liner roasting the user's vibe, in 12 words or fewer." },
    category:     { type: "string", enum: ["builder-brain","love-drunk","heartbreak","chaos","late-night"] },
  },
  required: ["matchedName","tastesLike","flavorProfile","whyThisMatch","roast","category"],
} as const;

function buildPrompt(input: MatchInput): string {
  const mood = input.mood?.trim() || "(no mood given)";
  const flavors = (input.selectedFlavors ?? []).join(", ") || "(no flavor tags)";
  const pref = input.customPreference?.trim() || "(no custom preference)";
  const isZh = input.lang === "zh";
  const langRule = isZh
    ? `OUTPUT LANGUAGE: Simplified Chinese for tastesLike / flavorProfile / whyThisMatch / roast. 'matchedName' MUST stay in the original English cocktail name. 'category' stays English.`
    : `OUTPUT LANGUAGE: English.`;

  const menuBlock = DCP_MENU.map(
    (c) => `- [${c.section}] "${c.name}" — ${c.ingredients}`,
  ).join("\n");

  return [
    langRule,
    ``,
    `You are the AI sommelier for Double Chicken Please (a NYC bar). You must MATCH the user's vibe to EXACTLY ONE cocktail from the fixed menu below. You are NOT inventing a new drink — you're picking the one that fits best and explaining why.`,
    ``,
    `=== USER VIBE ===`,
    `Mood: ${mood}`,
    `Flavor tags: ${flavors}`,
    `Custom preference: ${pref}`,
    ``,
    `=== DOUBLE CHICKEN PLEASE MENU (choose ONE) ===`,
    menuBlock,
    ``,
    `Rules:`,
    `- 'matchedName' MUST be one of the menu names above, spelled EXACTLY.`,
    `- Prefer the more adventurous "Free Range" or "The Coop" cocktails when the vibe is playful, weird, or emotional. Fall back to "Classics?" only when the user explicitly wants something classic/simple.`,
    `- Weigh both flavor compatibility AND emotional fit.`,
    `- 'tastesLike' and 'whyThisMatch' should reference REAL ingredients of the matched drink (not made-up ones), and tie back to the user's mood.`,
    `- 'roast' is the same witty tone as before — one sharp one-liner about the user's vibe.`,
  ].join("\n");
}

export const Route = createFileRoute("/api/match-dcp-cocktail")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        let input: MatchInput;
        try {
          input = (await request.json()) as MatchInput;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are a witty NYC cocktail sommelier who matches guests to a bar's existing menu. You always respond with valid JSON matching the provided schema and NEVER invent cocktails outside the menu." },
              { role: "user", content: buildPrompt(input) },
            ],
            response_format: {
              type: "json_schema",
              json_schema: { name: "dcp_match", strict: true, schema: SCHEMA },
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

        let parsed: MatchedCocktail;
        try {
          parsed = JSON.parse(content) as MatchedCocktail;
        } catch {
          return new Response("Bad JSON from model", { status: 502 });
        }

        // Find the matched cocktail in the fixed menu — this is our source of truth for ingredients.
        const menuItem =
          DCP_MENU.find((c) => c.name.toLowerCase() === parsed.matchedName.toLowerCase()) ??
          DCP_MENU[0];

        // Adapt to the same shape the frontend already uses for a generated cocktail.
        const isZh = input.lang === "zh";
        const shaped = {
          cocktailName: menuItem.name,
          tastesLike: parsed.tastesLike,
          flavorProfile: parsed.flavorProfile,
          ingredients: menuItem.ingredients.split(/,\s*/).map((s) => s.trim()).filter(Boolean),
          recipe: isZh
            ? `由 Double Chicken Please 团队现场调制。\n${parsed.whyThisMatch}`
            : `Crafted on-site by the Double Chicken Please team.\n${parsed.whyThisMatch}`,
          roast: parsed.roast,
          category: parsed.category,
          // Extra fields the DCP result card can show:
          matchedFromMenu: true,
          restaurantName: "Double Chicken Please",
          menuSection: menuItem.section,
          menuPrice: menuItem.price ?? null,
          whyThisMatch: parsed.whyThisMatch,
        };

        return new Response(JSON.stringify(shaped), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
