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
  vibeReference?: {
    name: string;
    tastesLike: string;
    flavorProfile: string;
    nameStyle?: "absurd" | "literary";
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
  const tashi = input.tashiReference;
  const tashiBlock = tashi
    ? [
        ``,
        `BASE SPIRIT LOCK: Tashi Baijiu (Tibetan highland barley liquor, 43% ABV — mellow, sweet, plateau grain). It MUST appear in the ingredients and recipe.`,
        `TASHI REFERENCE RECIPE — use this as inspiration. You MAY adapt measurements, swap one or two ingredients, or modernize the technique to better match the user's vibe, but keep it recognizably in the same family.`,
        `Reference name (DO NOT copy — invent a fresh witty name tied to the user's vibe): ${tashi.name}`,
        `Reference vibe (for tone reference only — write your OWN tastesLike, roast and flavor profile from scratch): ${tashi.vibe}`,
        `Reference ingredients:\n${tashi.ingredients.map((i) => `  - ${i}`).join("\n")}`,
        `Reference steps:\n${tashi.recipe.split("\n").filter(Boolean).map((s, i) => `  ${i + 1}. ${s}`).join("\n")}`,
        ``,
      ].join("\n")
    : "";
  const vibe = input.vibeReference;
  const isLiterary = vibe?.nameStyle === "literary";
  const vibeBlock = vibe
    ? [
        ``,
        `STYLE REFERENCE — 中文手写小酒馆菜单调性。这条参考的命名风格是：${isLiterary ? "【文艺 / 诗意 / 名词+名词 / 意象】" : "【荒诞 / 口语 / 内心OS / 吐槽 / 谐音】"}。`,
        `请参考这一条的"语气、节奏、意象密度"来生成你自己的 cocktailName / tastesLike / roast。绝对不要复用任何字符串。`,
        `参考名 (仅作语气参考，不可复用): ${vibe.name}`,
        `参考 tastes-like (仅作语气参考): ${vibe.tastesLike}`,
        `参考 flavor 描述 (仅作语气参考): ${vibe.flavorProfile}`,
        ``,
        `=== 中文起名硬性要求 (cocktailName) ===`,
        isLiterary
          ? [
              `这一次走【文艺 / 诗意】路线：`,
              `1. 推荐"名词+名词"或"意象+意象"的清新文艺命名，4–8 个字最佳（例如"星河晚祷""薄荷月光""雾中信使""琉璃夜色""晚风未眠"）。`,
              `2. 用意象、自然物、时间、光影、感官词组合，要有画面感和留白。`,
              `3. 避免口语吐槽、网络梗、感叹号；标点尽量克制（可不用，或仅用省略号、句号）。`,
              `4. tastesLike 写成一句带画面的散文（最多 30 字），flavorProfile 用感官细节描述，roast 收敛一点、带一丝苦涩或自嘲也可以。`,
            ].join("\n")
          : [
              `这一次走【荒诞 / 口语】路线：`,
              `1. 必须是一句完整的口语 / 内心独白 / 反问 / 吐槽 / 谐音梗，6–14 个字。这种场景下不要用"名词+名词"的清新文艺命名。`,
              `2. 越抽象越离谱越好。允许情绪化、自嘲、阴阳怪气、谐音、错别字梗、网络烂梗、生活吐槽、突然发疯、莫名其妙的转折。`,
              `3. 不要解释酒，名字是一句"人话"，不是一杯酒的描述。`,
              `4. 标点可以用感叹号、问号、省略号、破折号、波浪号，营造手写感。`,
              `5. 离谱起名示例（仅示范风格，禁止复用）：`,
              `   - "我真的栓Q了"`,
              `   - "再说一句我就走了啊"`,
              `   - "妈我不想上班了"`,
              `   - "你礼貌吗？"`,
              `   - "那没事了。"`,
              `   - "你先别急"`,
              `   - "再等等说不定他回消息了呢"`,
              `   - "笑死根本没人爱我"`,
              `tastesLike 写成一句日记体内心 OS（最多 30 字），flavorProfile 可以带俏皮的谐音 / 解释。roast 要够刺、够口语。`,
            ].join("\n"),
        ``,
      ].join("\n")
    : "";

  return [
    langRule,
    ``,
    `User mood / vibe: ${mood}`,
    `Flavor tags they picked: ${flavors}`,
    `Custom preference: ${pref}`,
    photo,
    tashiBlock,
    vibeBlock,
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
