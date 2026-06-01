import { createFileRoute } from "@tanstack/react-router";

interface GenBody {
  name?: string;
  ingredients?: string[];
  flavorProfile?: string;
  tastesLike?: string;
}

function buildPrompt(b: GenBody): string {
  const name = (b.name || "a cocktail").trim();
  const ingredients = (b.ingredients ?? [])
    .map((i) => i.replace(/^[0-9./\s]+(oz|tsp|tbsp|splash|dash|sprig|cup|ml)?\s*(of\s+)?/i, "").trim())
    .filter(Boolean)
    .slice(0, 6);
  const flavors = (b.flavorProfile || "").trim();

  // Infer glassware + color hints from name/ingredients
  const text = `${name} ${ingredients.join(" ")} ${flavors}`.toLowerCase();
  let glass = "an elegant cocktail glass appropriate to the drink";
  if (/martini/.test(text)) glass = "a classic martini glass";
  else if (/margarita/.test(text)) glass = "a margarita coupe with a salted rim";
  else if (/mojito|highball|collins|spritz/.test(text)) glass = "a tall highball glass with ice";
  else if (/sour|daiquiri|coupe/.test(text)) glass = "a stemmed coupe glass";
  else if (/negroni|old.fashioned|whisk/.test(text)) glass = "a short rocks glass with a large ice cube";
  else if (/punch|tiki/.test(text)) glass = "a tiki-style glass";

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

  return [
    `A delicate hand-painted watercolor illustration of the cocktail "${name}", served in ${glass}, garnished with ${garnish}.`,
    ingredientLine,
    flavorLine,
    `Style: loose traditional watercolor on warm cream paper, soft pigment bleeds, visible brushstrokes, gentle washes, subtle paper texture, luminous translucent liquid, soft pastel highlights.`,
    `Composition: single centered cocktail glass, full drink visible, no text, no words, no labels, no logos, no border, no frame, generous negative space, off-white (#faf5ee) paper background, soft natural light.`,
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
