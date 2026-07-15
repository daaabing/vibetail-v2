import { createFileRoute } from "@tanstack/react-router";
import { getEventMenu } from "@/lib/event-menus";
import { matchMenuDrink, type MatchProfile } from "@/lib/match-menu-drink";

interface MatchInput {
  menuSlug?: string;
  mood?: string;
  selectedFlavors?: string[];
  customPreference?: string;
  baseSpirit?: string;
  alcoholPreference?: "alcoholic" | "non_alcoholic" | "either";
  excludedIngredients?: string[];
  excludedAllergens?: string[];
  lang?: "zh" | "en";
}

/** Map Vibetail chip labels / mood text into flavor + mood tags used by the matcher. */
function deriveTags(input: MatchInput): { flavorTags: string[]; moodTags: string[] } {
  const flavorTags = (input.selectedFlavors ?? []).map((s) => s.toLowerCase());
  const moodText = `${input.mood ?? ""} ${input.customPreference ?? ""}`.toLowerCase();
  const MOOD_MAP: Record<string, string[]> = {
    hyped: ["hype", "excited", "pumped", "energetic", "hyped", "亢奋", "兴奋", "激动"],
    chill: ["chill", "calm", "relaxed", "mellow", "放松", "松弛", "平静"],
    focused: ["focus", "sharp", "productive", "focused", "专注", "冷静"],
    social: ["party", "friends", "social", "crowd", "聚会", "朋友"],
    tense: ["nervous", "anxious", "tense", "紧张", "焦虑"],
    celebratory: ["celebrate", "win", "victory", "赢", "庆祝"],
    bittersweet: ["heartbreak", "melancholy", "bitter", "sad", "失落", "苦涩", "五味杂陈"],
    bold: ["bold", "reckless", "wild", "大胆", "疯"],
    "late-night": ["late", "midnight", "insomnia", "深夜", "熬夜"],
    contemplative: ["thoughtful", "reflective", "quiet", "沉思", "安静"],
  };
  const moodTags: string[] = [];
  for (const [tag, kws] of Object.entries(MOOD_MAP)) {
    if (kws.some((k) => moodText.includes(k))) moodTags.push(tag);
  }
  return { flavorTags, moodTags };
}

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    vibeName: { type: "string", description: "A witty, vibe-driven cocktail name for the card front. NOT the menu name. 2-4 words." },
    tastesLike: { type: "string" },
    flavorProfile: { type: "string" },
    whyThisMatch: { type: "string" },
    roast: { type: "string" },
    category: { type: "string", enum: ["builder-brain", "love-drunk", "heartbreak", "chaos", "late-night"] },
  },
  required: ["vibeName", "tastesLike", "flavorProfile", "whyThisMatch", "roast", "category"],
} as const;

export const Route = createFileRoute("/api/match-event-menu")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let input: MatchInput;
        try {
          input = (await request.json()) as MatchInput;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const menu = input.menuSlug ? getEventMenu(input.menuSlug) : null;
        if (!menu) return new Response("Menu not found", { status: 404 });
        if (menu.status === "paused") {
          return Response.json({ paused: true, menuName: menu.name, menuId: menu.id }, { status: 423 });
        }

        const { flavorTags, moodTags } = deriveTags(input);
        const profile: MatchProfile = {
          moodTags,
          flavorTags,
          baseSpiritPreference: input.baseSpirit,
          alcoholPreference: input.alcoholPreference ?? "either",
          excludedIngredients: input.excludedIngredients,
          excludedAllergens: input.excludedAllergens,
        };

        const result = matchMenuDrink(profile, menu.drinks);
        const isZh = input.lang === "zh";

        if (!result) {
          return Response.json({
            noMenuMatch: true,
            menuId: menu.id,
            menuSlug: menu.slug,
            menuName: menu.name,
            message: isZh
              ? "当前菜单里暂时没有符合你偏好的饮品，可以向吧台询问其他选择。"
              : "No drink on tonight's menu fits your vibe yet — ask the bar for other options.",
          });
        }

        const drink = result.drink;

        // Ask AI for creative card-front copy — the drink itself is fixed.
        const key = process.env.LOVABLE_API_KEY;
        let shaped;
        if (!key) {
          shaped = {
            cocktailName: drink.name,
            menuItemName: drink.name,
            tastesLike: drink.description ?? "",
            flavorProfile: drink.flavorTags.slice(0, 4).join(", "),
            ingredients: drink.ingredients,
            recipe: isZh
              ? `由吧台现场调制。\n本场推荐给你：${drink.name}。`
              : `Crafted on-site by the bar.\nTonight's match for you: ${drink.name}.`,
            roast: "",
            category: "chaos",
            matchedFromMenu: true,
            restaurantName: menu.name,
            menuItemName_: drink.name,
            menuSection: null,
            menuPrice: null,
            whyThisMatch: isZh ? "根据你当下的心情从菜单里挑出来的一杯。" : "Picked from the menu based on your current vibe.",
            menuId: menu.id,
            menuSlug: menu.slug,
            menuName: menu.name,
            imageUrl: drink.imageUrl ?? null,
          };
        } else {
          const prompt = [
            isZh ? "OUTPUT LANGUAGE: Simplified Chinese for all fields." : "OUTPUT LANGUAGE: English.",
            "",
            `You are the sommelier for tonight's event: "${menu.name}". The user's vibe has been matched (deterministically) to ONE menu drink. Write creative card copy that ties their vibe to this exact drink. Do NOT invent a new drink.`,
            "",
            "=== USER VIBE ===",
            `Mood: ${input.mood ?? "(none)"}`,
            `Flavor tags: ${(input.selectedFlavors ?? []).join(", ") || "(none)"}`,
            `Custom preference: ${input.customPreference ?? "(none)"}`,
            "",
            "=== MATCHED MENU DRINK (FIXED) ===",
            `Name: ${drink.name}`,
            `Ingredients: ${drink.ingredients.join(", ")}`,
            drink.description ? `Description: ${drink.description}` : "",
            `Flavor tags: ${drink.flavorTags.join(", ")}`,
            `Mood tags: ${drink.moodTags.join(", ")}`,
            "",
            "Rules:",
            "- 'vibeName' is a witty 2-4 word title for the card front (NOT the menu name).",
            "- 'tastesLike' and 'whyThisMatch' MUST reference the drink's real ingredients.",
            "- 'roast' is one sharp, witty one-liner about the user's vibe (≤12 words).",
          ].join("\n");

          const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: "You write witty cocktail card copy for a fixed menu match. Always return valid JSON matching the schema." },
                { role: "user", content: prompt },
              ],
              response_format: { type: "json_schema", json_schema: { name: "event_match", strict: true, schema: SCHEMA } },
            }),
            signal: request.signal,
          });

          if (!upstream.ok) {
            const text = await upstream.text().catch(() => "");
            return new Response(text || "Upstream error", { status: upstream.status });
          }

          const json = (await upstream.json()) as { choices?: Array<{ message?: { content?: string } }> };
          const content = json.choices?.[0]?.message?.content;
          if (!content) return new Response("No content", { status: 502 });

          let parsed: {
            vibeName: string; tastesLike: string; flavorProfile: string;
            whyThisMatch: string; roast: string; category: string;
          };
          try { parsed = JSON.parse(content); } catch { return new Response("Bad JSON from model", { status: 502 }); }

          shaped = {
            cocktailName: parsed.vibeName,
            menuItemName: drink.name,
            tastesLike: parsed.tastesLike,
            flavorProfile: parsed.flavorProfile,
            ingredients: drink.ingredients,
            recipe: isZh
              ? `由吧台现场调制。\n${parsed.whyThisMatch}`
              : `Crafted on-site by the bar.\n${parsed.whyThisMatch}`,
            roast: parsed.roast,
            category: parsed.category,
            matchedFromMenu: true,
            restaurantName: menu.name,
            menuSection: null,
            menuPrice: null,
            whyThisMatch: parsed.whyThisMatch,
            menuId: menu.id,
            menuSlug: menu.slug,
            menuName: menu.name,
            matchedDrinkId: drink.id,
            imageUrl: drink.imageUrl ?? null,
          };
        }

        return Response.json(shaped);
      },
    },
  },
});
