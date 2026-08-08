import { createFileRoute } from "@tanstack/react-router";

interface MerchantCtx {
  actualDrinkName?: string;
  actualDrinkDescription?: string;
  actualDrinkIngredients?: string[];
  vibeDrinkName?: string;
  vibeDescription?: string;
  whyThisMatch?: string;
  toneKeywords?: string;
}

interface GenBody {
  name?: string;
  ingredients?: string[];
  flavorProfile?: string;
  tastesLike?: string;
  recipe?: string;
  merchant?: MerchantCtx;
}

function buildPrompt(b: GenBody): string {
  const name = (b.name || "a cocktail").trim();
  const ingredients = (b.ingredients ?? [])
    .map((i) =>
      i.replace(/^[0-9./\s]+(oz|tsp|tbsp|splash|dash|sprig|cup|ml)?\s*(of\s+)?/i, "").trim(),
    )
    .filter(Boolean)
    .slice(0, 6);
  const flavors = (b.flavorProfile || "").trim();
  const recipe = (b.recipe || "").toLowerCase();

  // Infer glassware + format from name/ingredients/recipe
  const text = `${name} ${ingredients.join(" ")} ${flavors} ${recipe}`.toLowerCase();

  const longCues =
    /(highball|collins|spritz|mojito|paloma|long\s*island|moscow mule|gin\s*&?\s*tonic|tonic|club soda|soda water|sparkling|seltzer|ginger beer|ginger ale|lemonade|cola|coke|top(ped)? with|fill(ed)? with|tall glass|over ice)/;
  const shortCues =
    /(martini|manhattan|negroni|old.fashioned|sazerac|gimlet|sidecar|aviation|daiquiri|sour|coupe|nick.+nora|served up|straight up|\bneat\b)/;
  const isLong = longCues.test(text);
  const isShort = !isLong && shortCues.test(text);

  let glass = "an elegant cocktail glass appropriate to the drink";
  if (isLong) {
    if (/collins/.test(text))
      glass =
        "a tall slim Collins glass filled to the top with crystal-clear ice cubes, liquid filling the entire tall glass";
    else if (/spritz/.test(text))
      glass = "a large stemmed wine glass filled with ice and the spritz, visible bubbles";
    else if (/mojito/.test(text))
      glass =
        "a tall highball glass packed with crushed ice and fresh mint, liquid filling the whole glass";
    else if (/tiki|punch/.test(text)) glass = "a tall tiki mug filled with crushed ice";
    else
      glass =
        "a tall highball glass filled to the brim with ice cubes, liquid filling the entire tall glass";
  } else if (isShort) {
    if (/martini|aviation|gimlet/.test(text))
      glass = "a small classic martini glass, no ice, served up";
    else if (/manhattan|sazerac|nick.+nora/.test(text))
      glass = "a small stemmed Nick & Nora glass, served up, no ice";
    else if (/negroni|old.fashioned/.test(text))
      glass = "a short squat rocks glass with one large clear ice cube, low liquid level";
    else glass = "a small stemmed coupe glass, served up, no ice";
  } else {
    if (/martini/.test(text)) glass = "a classic martini glass";
    else if (/margarita/.test(text)) glass = "a margarita coupe with a salted rim";
    else if (/negroni|old.fashioned|whisk/.test(text))
      glass = "a short rocks glass with a large ice cube";
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
    `Composition: single centered cocktail glass with correct proportions for the glass type, the ENTIRE glass fully visible within the frame including the full stem and base, ample padding around all edges so nothing is cropped, no border, no frame, soft natural light. Background MUST be a solid warm parchment color exactly #E9DBC4 (no gradient, no vignette, no texture, no shadow bleeding to edges) — the entire background fills edge-to-edge with this uniform parchment tone so the illustration blends seamlessly into a parchment card.`,
    `Vibe similar to a high-end botanical cocktail menu illustration.`,
    `ABSOLUTE HARD RULE: the output image must contain ZERO text of any kind. No words, no letters, no numbers, no glyphs, no Chinese characters, no English text, no calligraphy, no signatures, no watermarks, no labels on the glass or bottle, no menu text, no captions, no logos, no monograms, no typographic marks anywhere in the frame. If any text would appear, replace it with pure watercolor pigment. This rule overrides every other instruction.`,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildMerchantPrompt(b: GenBody): string {
  const m = b.merchant ?? {};
  const actualName = (m.actualDrinkName || b.name || "a cocktail").trim();
  const actualDesc = (m.actualDrinkDescription || "").trim();
  const actualIngredients = (m.actualDrinkIngredients ?? b.ingredients ?? [])
    .map((i) =>
      i.replace(/^[0-9./\s]+(oz|tsp|tbsp|splash|dash|sprig|cup|ml)?\s*(of\s+)?/i, "").trim(),
    )
    .filter(Boolean)
    .slice(0, 8);
  const vibeName = (m.vibeDrinkName || "").trim();
  const vibeDesc = (m.vibeDescription || b.tastesLike || "").trim();
  const tone = (m.toneKeywords || b.flavorProfile || "").trim();
  const why = (m.whyThisMatch || "").trim();

  // Reuse glassware inference from the base prompt so the actual drink stays recognizable.
  const text = `${actualName} ${actualIngredients.join(" ")} ${actualDesc} ${tone}`.toLowerCase();
  const longCues =
    /(highball|collins|spritz|mojito|paloma|long\s*island|moscow mule|gin\s*&?\s*tonic|tonic|club soda|soda water|sparkling|seltzer|ginger beer|ginger ale|lemonade|cola|coke|top(ped)? with|fill(ed)? with|tall glass|over ice)/;
  const shortCues =
    /(martini|manhattan|negroni|old.fashioned|sazerac|gimlet|sidecar|aviation|daiquiri|sour|coupe|nick.+nora|served up|straight up|\bneat\b)/;
  const isLong = longCues.test(text);
  const isShort = !isLong && shortCues.test(text);
  let glass = "an elegant glass appropriate to the drink";
  if (isLong)
    glass = /collins/.test(text)
      ? "a tall slim Collins glass filled with crystal-clear ice, liquid to the top"
      : /spritz/.test(text)
        ? "a large stemmed wine glass filled with ice and the spritz, visible bubbles"
        : /mojito/.test(text)
          ? "a tall highball glass packed with crushed ice and fresh mint"
          : "a tall highball glass filled to the brim with ice cubes";
  else if (isShort)
    glass = /martini|aviation|gimlet/.test(text)
      ? "a small classic martini glass, no ice, served up"
      : /negroni|old.fashioned/.test(text)
        ? "a short rocks glass with one large clear ice cube"
        : "a small stemmed coupe glass, served up, no ice";

  let garnish = "a fitting garnish";
  if (/lime|margarita|mojito|gimlet/.test(text)) garnish = "a fresh lime wedge";
  else if (/lemon|sour|collins/.test(text)) garnish = "a lemon twist";
  else if (/orange|negroni|old.fashioned/.test(text)) garnish = "an orange peel";
  else if (/mint|mojito/.test(text)) garnish = "a sprig of mint";
  else if (/cherry|manhattan/.test(text)) garnish = "a maraschino cherry";
  else if (/espresso|coffee/.test(text)) garnish = "three coffee beans floating on foam";
  else if (/cucumber/.test(text)) garnish = "a thin cucumber ribbon";

  const ingredientLine = actualIngredients.length
    ? `Real ingredients that must inform liquid color, clarity and texture: ${actualIngredients.join(", ")}.`
    : "";
  const descLine = actualDesc
    ? `Actual drink description (defines the true identity — do not deviate): ${actualDesc}.`
    : "";
  const vibeLine = vibeDesc
    ? `Vibe interpretation (shapes composition, focal point, edge softness, background wash, pigment temperature — never literal objects): ${vibeDesc}.`
    : "";
  const toneLine = tone ? `Tone keywords: ${tone}.` : "";
  const whyLine = why ? `Emotional through-line to hint at through color rhythm: ${why}.` : "";

  return [
    `A premium hand-painted watercolor illustration for an upscale restaurant menu — a beautiful watercolor portrait of the real cocktail "${actualName}", subtly elevated by the personality of a vibe interpretation titled "${vibeName}".`,
    `LAYER 1 (drink identity — must stay accurate and recognizable): served in ${glass}, garnished with ${garnish}. ${descLine} ${ingredientLine}`,
    `LAYER 2 (vibe interpretation — subtle artistic direction only, NEVER add symbolic objects, scenes, characters, extra ingredients or props): ${vibeLine} ${toneLine} ${whyLine} Let the vibe influence composition rhythm, focal point choice (garnish, rim, ice, or a color gradient in the liquid), edge softness vs sharpness, pigment temperature, and the intensity of the background wash — nothing more.`,
    `Style: elegant hand-painted watercolor drink illustration — delicate linework, translucent layered washes, visible cold-press paper texture, refined and restrained, never cartoonish, cohesive with a curated restaurant menu illustration set. Loose pigment bleeds, gentle brushstrokes, luminous translucent liquid, soft pastel highlights.`,
    `Composition: intentional (not a generic centered product shot). ONE clear focal point (garnish, rim, top ice, or liquid color gradient). The ENTIRE glass fully visible within the frame including full stem and base, ample padding around all edges, nothing cropped, no border, no frame.`,
    `Background: restrained warm ivory paper — solid warm parchment exactly #E9DBC4 across the whole frame, with only the faintest watercolor wash whose hue is drawn from the actual drink palette and the vibe tone. No scene, no vignette, no heavy shadow bleeding to edges — the illustration must sit seamlessly on a parchment card.`,
    `ABSOLUTE HARD RULE: the output image must contain ZERO text of any kind. No words, no letters, no numbers, no glyphs, no Chinese characters, no English text, no calligraphy, no signatures, no watermarks, no labels on the glass or bottle, no menu text, no captions, no logos, no monograms, no typographic marks anywhere in the frame. If any text would appear, replace it with pure watercolor pigment. This rule overrides every other instruction.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export const Route = createFileRoute("/api/generate-cocktail-image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) {
          if (process.env.NODE_ENV === "production") {
            return new Response("Missing LOVABLE_API_KEY", { status: 500 });
          }
          // Locally there is no illustrator; the card falls back to its drawn
          // glass, which is a legitimate state in production too.
          return new Response(JSON.stringify({ imageData: null }), {
            status: 200,
            headers: { "Content-Type": "application/json", "X-Vibetail-Stub": "1" },
          });
        }

        let body: GenBody;
        try {
          body = (await request.json()) as GenBody;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const prompt = body.merchant ? buildMerchantPrompt(body) : buildPrompt(body);

        let upstream: Response;
        try {
          upstream = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image",
              messages: [{ role: "user", content: prompt }],
              modalities: ["image", "text"],
            }),
            signal: request.signal,
          });
        } catch (err) {
          if ((err as { name?: string })?.name === "AbortError" || request.signal.aborted) {
            return new Response("Client aborted", { status: 499 });
          }
          console.error("generate-cocktail-image fetch failed", err);
          return new Response("Upstream fetch failed", { status: 502 });
        }

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
