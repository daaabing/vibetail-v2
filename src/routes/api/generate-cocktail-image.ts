import { createFileRoute } from "@tanstack/react-router";

interface GenBody {
  name?: string;
  ingredients?: string[];
  flavorProfile?: string;
  tastesLike?: string;
  recipe?: string;
}

function buildPrompt(b: GenBody): string {
  const name = (b.name || "a cocktail").trim();
  const ingredients = (b.ingredients ?? [])
    .map((i) => i.replace(/^[0-9./\s]+(oz|tsp|tbsp|splash|dash|sprig|cup|ml)?\s*(of\s+)?/i, "").trim())
    .filter(Boolean)
    .slice(0, 6);
  const flavors = (b.flavorProfile || "").trim();
  const recipe = (b.recipe || "").toLowerCase();

  // Infer glassware + format from name/ingredients/recipe
  const text = `${name} ${ingredients.join(" ")} ${flavors} ${recipe}`.toLowerCase();

  const longCues = /(highball|collins|spritz|mojito|paloma|long\s*island|moscow mule|gin\s*&?\s*tonic|tonic|club soda|soda water|sparkling|seltzer|ginger beer|ginger ale|lemonade|cola|coke|top(ped)? with|fill(ed)? with|tall glass|over ice)/;
  const shortCues = /(martini|manhattan|negroni|old.fashioned|sazerac|gimlet|sidecar|aviation|daiquiri|sour|coupe|nick.+nora|served up|straight up|\bneat\b)/;
  const isLong = longCues.test(text);
  const isShort = !isLong && shortCues.test(text);

  let glass = "an elegant cocktail glass appropriate to the drink";
  if (isLong) {
    if (/collins/.test(text)) glass = "a tall slim Collins glass filled to the top with crystal-clear ice cubes, liquid filling the entire tall glass";
    else if (/spritz/.test(text)) glass = "a large stemmed wine glass filled with ice and the spritz, visible bubbles";
    else if (/mojito/.test(text)) glass = "a tall highball glass packed with crushed ice and fresh mint, liquid filling the whole glass";
    else if (/tiki|punch/.test(text)) glass = "a tall tiki mug filled with crushed ice";
    else glass = "a tall highball glass filled to the brim with ice cubes, liquid filling the entire tall glass";
  } else if (isShort) {
    if (/martini|aviation|gimlet/.test(text)) glass = "a small classic martini glass, no ice, served up";
    else if (/manhattan|sazerac|nick.+nora/.test(text)) glass = "a small stemmed Nick & Nora glass, served up, no ice";
    else if (/negroni|old.fashioned/.test(text)) glass = "a short squat rocks glass with one large clear ice cube, low liquid level";
    else glass = "a small stemmed coupe glass, served up, no ice";
  } else {
    if (/martini/.test(text)) glass = "a classic martini glass";
    else if (/margarita/.test(text)) glass = "a margarita coupe with a salted rim";
    else if (/negroni|old.fashioned|whisk/.test(text)) glass = "a short rocks glass with a large ice cube";
    else if (/punch|tiki/.test(text)) glass = "a tiki-style glass";
  }

  let garnish = "a fitting garnish";
  if (/lime|margarita|mojito|gimlet/.test(text)) garnish = "a fresh lime wedge";
  else if (/lemon|sour|collins/.test(text)) garnish = "a lemon twist";
  else if (/orange|negroni|old.fashioned/.test(text)) garnish = "an orange peel";
  else if (/mint|mojito/.test(text)) garnish = "a sprig of mint";
  else if (/cherry|manhattan/.test(text)) garnish = "a maraschino cherry";
  else if (/espresso|coffee/.test(text)) garnish = "three coffee beans floating on foam";
  else if (/cucumber/.test(text)) garnish = "a thin cucumber ribbon";

  const ingredientLine = ingredients.length
    ? `Color and texture should reflect the ingredients: ${ingredients.join(", ")}.`
    : "";
  const flavorLine = flavors ? `Mood: ${flavors}.` : "";
  const formatLine = isLong
    ? `Format: this is a LONG DRINK — must be served in a TALL glass (highball or Collins), filled to the top with ice and liquid, refreshing and sippable. ABSOLUTELY DO NOT depict a small coupe, martini, or low rocks glass.`
    : isShort
      ? `Format: this is a SHORT DRINK — small spirit-forward pour in a small stemmed glass or low rocks glass. Do NOT depict a tall highball or Collins glass.`
      : "";

  return [
    `A delicate hand-painted watercolor illustration of the cocktail "${name}", served in ${glass}, garnished with ${garnish}.`,
    formatLine,
    ingredientLine,
    flavorLine,
    `Style: loose traditional watercolor on warm cream paper, soft pigment bleeds, visible brushstrokes, gentle washes, subtle paper texture, luminous translucent liquid, soft pastel highlights.`,
    `Composition: single centered cocktail glass with correct proportions for the glass type, full drink visible, no text, no words, no labels, no logos, no border, no frame, generous negative space, off-white (#faf5ee) paper background, soft natural light.`,
    `Vibe similar to a high-end botanical cocktail menu illustration.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export const Route = createFileRoute("/api/generate-cocktail-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        let body: GenBody;
        try {
          body = (await request.json()) as GenBody;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const prompt = buildPrompt(body);

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          }),
          signal: request.signal,
        });

        if (!upstream.ok) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || "Upstream error", { status: upstream.status });
        }

        const json = (await upstream.json()) as { data?: Array<{ b64_json?: string }> };
        const b64 = json.data?.[0]?.b64_json;
        if (!b64) return new Response("No image returned", { status: 502 });

        return new Response(JSON.stringify({ imageData: b64 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
