import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { PublicMenuItem } from "@/lib/matching/types";

// Generic menu-match endpoint.
// Body: { merchantSlug, menuSlug, gameId, mood, selectedFlavors, customPreference, lang, anonymousSessionId }
// Loads the published menu, asks the AI to pick exactly one item, persists
// game_session + game_result + recommendation, returns the same shape the
// existing DCP result card already renders.

interface MatchBody {
  merchantSlug: string;
  menuSlug: string;
  gameId?: string;
  mood?: string;
  selectedFlavors?: string[];
  customPreference?: string;
  lang?: "zh" | "en";
  anonymousSessionId?: string;
  vibeReference?: {
    name: string;
    tastesLike: string;
    flavorProfile: string;
    nameStyle?: "absurd" | "literary";
  } | null;
}

function serverClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function loadPublishedMenu(merchantSlug: string, menuSlug: string) {
  const supabase = serverClient();
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, slug, name")
    .eq("slug", merchantSlug)
    .eq("is_active", true)
    .maybeSingle();
  if (!merchant) return null;
  const { data: menu } = await supabase
    .from("menus")
    .select(
      "id, slug, name, status, enabled_game_ids, published_version_id, menu_file_url, menu_file_type",
    )
    .eq("merchant_id", merchant.id)
    .eq("slug", menuSlug)
    .eq("status", "published")
    .maybeSingle();
  if (!menu?.published_version_id) return null;
  const { data: items } = await supabase
    .from("menu_items")
    .select(
      "id, name, description, ingredients, image_url, alcoholic, base_spirit, flavor_tags, mood_tags, dimensions, allergens, recommendation_priority, availability_status, section",
    )
    .eq("menu_id", menu.id)
    .eq("availability_status", "active");
  const mapped: PublicMenuItem[] = (items ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    ingredients: row.ingredients ?? [],
    imageUrl: row.image_url,
    alcoholic: row.alcoholic,
    baseSpirit: row.base_spirit,
    flavorTags: row.flavor_tags ?? [],
    moodTags: row.mood_tags ?? [],
    dimensions: (row.dimensions as Record<string, number> | null) ?? {},
    allergens: row.allergens ?? [],
    recommendationPriority: row.recommendation_priority ?? 0,
    availabilityStatus: "active",
    section: row.section,
  }));
  return { merchant, menu, items: mapped };
}

function buildPrompt(
  input: MatchBody,
  items: PublicMenuItem[],
): { system: string; user: string; names: string[] } {
  const mood = input.mood?.trim() || "(no mood given)";
  const flavors = (input.selectedFlavors ?? []).join(", ") || "(no flavor tags)";
  const pref = input.customPreference?.trim() || "(no custom preference)";
  const isZh = input.lang === "zh";
  const vibe = input.vibeReference ?? null;
  // Chinese output is ALWAYS the 吐槽/口语/内心OS style — that's the brand voice.
  const isLiterary = !isZh && vibe?.nameStyle === "literary" && Math.random() < 0.5;
  const vibeBlock =
    isZh && vibe
      ? [
          ``,
          `=== 中文起名语气参考（真实手写小酒馆菜单示例） ===`,
          `参考名（仅作语气参考，禁止复用）: ${vibe.name}`,
          `参考 tasting note（仅作语气参考）: ${vibe.tastesLike}`,
          `参考 flavor 描述（仅作语气参考）: ${vibe.flavorProfile}`,
          ``,
          `【极其重要 - 主题隔离】参考条目只用来学"语气 / 节奏 / 句式"，绝对不要沿用参考条目的"主题 / 场景 / 关系对象 / 情绪对象"。`,
          `例如：参考条目是恋爱 / 暧昧 / 前任 / 接盘 / 表白 / 分手类，但用户当下的 vibe 是失业 / 裁员 / 被优化 / 搬家 / 独处 / 学业 / 疲惫，那 vibeName 必须完全围绕用户当下的主题，绝对不能出现"恋爱 / 接盘 / 前任 / 暧昧 / 表白 / 分手 / 男友 / 女友 / 对象"这些参考条目里才有的词。反之亦然。`,
          `vibeName 里出现的名词 / 场景 / 对象，必须来自"用户当下的 mood / flavor / preference"，不能来自"参考条目"。`,
          ``,
        ].join("\n")
      : "";

  const langRule = isZh
    ? [
        `OUTPUT LANGUAGE: Simplified Chinese (简体中文) for vibeName / tastesLike / flavorProfile / whyThisMatch / roast. 'matchedName' MUST stay in the original menu name (不要翻译). 'category' stays English.`,
        ``,
        `=== 中文起名硬性要求 (vibeName) ===`,
        `vibeName 是酒卡正面的"人话酒名"，只跟用户当下的 vibe 有关，绝对不要复用/影射 matchedName 或菜单里的酒名。参考中文手写小酒馆菜单的调性，要有个性、有情绪、有画面感。`,
        isLiterary
          ? [
              `这一次走【文艺 / 诗意】路线：`,
              `1. 推荐"名词+名词"或"意象+意象"的清新文艺命名，4–8 个字最佳（例如"星河晚祷""薄荷月光""雾中信使""琉璃夜色""晚风未眠"）。`,
              `2. 用意象、自然物、时间、光影、感官词组合，要有画面感和留白。`,
              `3. 避免口语吐槽、网络梗、感叹号；标点尽量克制。`,
            ].join("\n")
          : [
              `这一次走【荒诞 / 口语 / 内心OS / 吐槽 / 谐音】路线。中文的 vibeName 必须是这种风格，绝对不要"名词+名词"的清新文艺命名，也不要意象堆砌。`,
              `1. vibeName 必须是一句完整的口语 / 内心独白 / 反问 / 吐槽 / 谐音梗 / 生活感慨，6–14 个字。`,
              `2. 越抽象越离谱越好。允许情绪化、自嘲、阴阳怪气、谐音、错别字梗、网络烂梗、生活吐槽、突然发疯、莫名其妙的转折。`,
              `3. 不要解释酒，名字是一句"人话"，不是一杯酒的描述。禁止出现"月光/星河/夜色/晚风/薄荷/信使/银河/祷"这类清新文艺词。`,
              `4. 标点可以用感叹号、问号、省略号、破折号、波浪号，营造手写感。`,
              `5. 参考真实小酒馆手写菜单风格（示例仅示范风格，禁止复用任何一个）：`,
              `   - "你要这样想我也没办法" / "绝望的直女" / "还以为是被爱了"`,
              `   - "所以我们现在是什么关系" / "莫非是瞧上小生了？" / "听老婆的话会发达"`,
              `   - "你听听我的心慌不慌" / "想吃辣的想喝凉的" / "本人已读不回"`,
              `   - "我真的栓Q了" / "那没事了。" / "你先别急" / "笑死根本没人爱我" / "又不是没爱过"`,
              `6. 【硬性禁忌】除非用户当下的 mood / vibe 明确提到工作 / 上班 / 加班 / KPI / 老板 / 打工，否则名字里绝对不要出现"班""上班""加班""班味""打工""KPI""老板""下班"等工作相关词。不要把每一杯都写成打工人吐槽。`,
            ].join("\n"),
        `tastesLike 写成一句带画面的中文散文（最多 30 字）。roast 要够刺、够口语、12 字以内。`,
        ``,
      ].join("\n")
    : `OUTPUT LANGUAGE: English.`;
  // Shuffle so ordering / "first plausible pick" bias doesn't dominate across sessions.
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  const menuBlock = shuffled
    .map((c) => {
      const lines = [`- "${c.name}"`];
      if (c.section) lines.push(`    section: ${c.section}`);
      if (c.baseSpirit) lines.push(`    base spirit: ${c.baseSpirit}`);
      lines.push(`    alcoholic: ${c.alcoholic ? "yes" : "no"}`);
      if (c.ingredients.length) lines.push(`    ingredients: ${c.ingredients.join(", ")}`);
      if (c.description) lines.push(`    description: ${c.description}`);
      if (c.flavorTags.length) lines.push(`    flavor tags: ${c.flavorTags.join(", ")}`);
      if (c.moodTags.length) lines.push(`    mood tags: ${c.moodTags.join(", ")}`);
      const dims = Object.entries(c.dimensions ?? {})
        .filter(([, v]) => typeof v === "number")
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
      if (dims) lines.push(`    dimensions (0-1): ${dims}`);
      if (c.allergens.length) lines.push(`    allergens: ${c.allergens.join(", ")}`);
      if (c.recommendationPriority) lines.push(`    priority: ${c.recommendationPriority}`);
      return lines.join("\n");
    })
    .join("\n");
  const names = shuffled.map((i) => i.name);

  return {
    names,
    system:
      "You are a witty cocktail sommelier who matches guests to a venue's existing menu. You always respond with valid JSON matching the provided schema and NEVER invent items outside the menu.",
    user: [
      langRule,
      vibeBlock,
      ``,
      `You must MATCH the user's vibe to EXACTLY ONE item from the fixed menu below. You are NOT inventing a new drink — you're picking the one that fits best and explaining why.`,
      ``,
      `=== USER VIBE ===`,
      `Mood: ${mood}`,
      `Flavor tags: ${flavors}`,
      `Custom preference: ${pref}`,
      ``,
      `=== MENU (choose ONE) ===`,
      menuBlock,
      ``,
      `Matching rules — USE EVERY SIGNAL, do not default to the first item:`,
      `- Score each menu item against the user's vibe using ALL provided metadata: flavor tags, mood tags, dimensions (sweetness/acidity/bitterness/body/strength on 0-1), base spirit, ingredients, description, section.`,
      `- Weigh mood-tag overlap and flavor-tag overlap heavily; use dimensions as tie-breakers.`,
      `- Respect the user's custom preference literally (e.g. "no whiskey", "light and citrusy", "non-alcoholic") — items that violate it are disqualified.`,
      `- Prefer alcoholic items unless the user's vibe/preference clearly asks for non-alcoholic.`,
      `- Ignore obviously placeholder or test items (e.g. an item literally named "test") unless nothing else fits.`,
      `- Use 'priority' only as a tie-breaker when two items score equally well; it is NOT a default.`,
      `- CRITICAL variety rule: do NOT default to the item with the richest / most evocative metadata just because it "reads" cocktail-like. Score against the ACTUAL user vibe. A crisp/light/refreshing vibe should land on a crisp/light/refreshing item even when a richer, more nostalgic item exists on the menu. When two items are close, prefer the one whose flavor + mood tags most literally echo the user's words.`,

      `Output rules:`,
      `- 'matchedName' MUST be one of the menu names above, spelled EXACTLY.`,
      `- 'vibeName' is a creative, vibe-driven title for the card front — a poetic 2-4 word phrase inspired ONLY by the user's mood/flavor/preference. It MUST NOT contain, echo, or riff on any word from 'matchedName' or the menu item's name. Think evocative imagery (e.g. "Velvet Midnight", "Paper Moon"), not the drink's label.`,
      `- 'tastesLike' is a warm, evocative 1-2 sentence tasting note tied to the user's vibe (like a sommelier's poetic description). Reference REAL ingredients of the matched drink. Do NOT name the menu item.`,
      `- 'whyThisMatch' is a PLAYFUL, cheeky 1-2 sentence explanation of why this specific drink fits this specific vibe — witty and fun, like a bartender teasing a regular. Reference the drink's ingredients, character, or emotional through-line. NEVER mention menu size, availability, lack of alternatives, or that it was the "only option" — always frame the pick as an intentional, inspired match, even if the menu is short.`,
      `- 'roast' is one sharp witty one-liner about the user's vibe, 12 words or fewer.`,
      `- Keep 'tastesLike' warm and celebratory; let 'whyThisMatch' be the fun, teasing one; save the real bite for 'roast'.`,
    ].join("\n"),
  };
}

export const Route = createFileRoute("/api/menu-match")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        let input: MatchBody;
        try {
          input = (await request.json()) as MatchBody;
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        if (!input.merchantSlug || !input.menuSlug) {
          return new Response("Missing merchantSlug/menuSlug", { status: 400 });
        }

        const loaded = await loadPublishedMenu(input.merchantSlug, input.menuSlug);
        if (!loaded) return new Response("Menu not found or not published", { status: 404 });
        if (loaded.items.length === 0)
          return new Response("Menu has no active items", { status: 409 });

        const gameId = input.gameId ?? "vibetail-mood";
        const enabled = loaded.menu.enabled_game_ids ?? [];
        if (!enabled.includes(gameId)) {
          return new Response(`Game ${gameId} not enabled for this menu`, { status: 409 });
        }

        const { system, user, names } = buildPrompt(input, loaded.items);
        const SCHEMA = {
          type: "object",
          additionalProperties: false,
          properties: {
            matchedName: { type: "string", enum: names },
            vibeName: { type: "string" },
            tastesLike: { type: "string" },
            flavorProfile: { type: "string" },
            whyThisMatch: { type: "string" },
            roast: { type: "string" },
            category: {
              type: "string",
              enum: ["builder-brain", "love-drunk", "heartbreak", "chaos", "late-night"],
            },
          },
          required: [
            "matchedName",
            "vibeName",
            "tastesLike",
            "flavorProfile",
            "whyThisMatch",
            "roast",
            "category",
          ],
        } as const;

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
            response_format: {
              type: "json_schema",
              json_schema: { name: "menu_match", strict: true, schema: SCHEMA },
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

        let parsed: {
          matchedName: string;
          vibeName: string;
          tastesLike: string;
          flavorProfile: string;
          whyThisMatch: string;
          roast: string;
          category: string;
        };
        try {
          parsed = JSON.parse(content);
        } catch {
          return new Response("Bad JSON from model", { status: 502 });
        }

        const menuItem = loaded.items.find(
          (c) => c.name.toLowerCase().trim() === parsed.matchedName.toLowerCase().trim(),
        );
        if (!menuItem) {
          console.error("[menu-match] model returned unknown name", {
            returned: parsed.matchedName,
            validNames: loaded.items.map((i) => i.name),
          });
          return new Response(
            JSON.stringify({
              error: "Match failed. Please try again.",
              detail: `Unknown item: ${parsed.matchedName}`,
            }),
            { status: 502, headers: { "Content-Type": "application/json" } },
          );
        }

        // Persist analytics (best-effort; do not fail the response if this errors).
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: session } = await supabaseAdmin
            .from("game_sessions")
            .insert({
              anonymous_session_id: input.anonymousSessionId ?? "anon",
              merchant_id: loaded.merchant.id,
              menu_id: loaded.menu.id,
              menu_version_id: loaded.menu.published_version_id,
              game_id: gameId,
              game_version: "1",
              is_preview: false,
            })
            .select("id")
            .single();
          if (session) {
            const { data: result } = await supabaseAdmin
              .from("game_results")
              .insert({
                game_session_id: session.id,
                display_result: {
                  vibeName: parsed.vibeName,
                  tastesLike: parsed.tastesLike,
                  flavorProfile: parsed.flavorProfile,
                  roast: parsed.roast,
                  category: parsed.category,
                  mood: input.mood ?? "",
                  selectedFlavors: input.selectedFlavors ?? [],
                },
                match_profile: {
                  moodTags: [],
                  flavorTags: input.selectedFlavors ?? [],
                  dimensions: {},
                  exclusions: { allergens: [], ingredients: [], baseSpirits: [] },
                },
              })
              .select("id")
              .single();
            if (result) {
              await supabaseAdmin.from("recommendations").insert({
                game_result_id: result.id,
                menu_id: loaded.menu.id,
                menu_version_id: loaded.menu.published_version_id,
                matched_menu_item_id: menuItem.id,
                score: 1,
                recommendation_reason: parsed.whyThisMatch,
              });
            }
          }
        } catch (e) {
          console.warn("[menu-match] persistence failed", e);
        }

        const isZh = input.lang === "zh";
        const shaped = {
          cocktailName: parsed.vibeName,
          menuItemName: menuItem.name,
          menuItemDescription: menuItem.description ?? "",
          menuItemIngredients: menuItem.ingredients,
          tastesLike: parsed.tastesLike,
          flavorProfile: parsed.flavorProfile,
          ingredients: menuItem.ingredients,
          recipe: isZh
            ? `由 ${loaded.merchant.name} 团队现场调制。\n${parsed.whyThisMatch}`
            : `Crafted on-site by the ${loaded.merchant.name} team.\n${parsed.whyThisMatch}`,
          roast: parsed.roast,
          category: parsed.category,
          matchedFromMenu: true,
          restaurantName: loaded.merchant.name,
          menuSection: menuItem.section,
          menuPrice: null,
          whyThisMatch: parsed.whyThisMatch,
          menuItemImageUrl: menuItem.imageUrl ?? null,
          fullMenuUrl: (loaded.menu as { menu_file_url?: string | null }).menu_file_url ?? null,
          fullMenuType: ((loaded.menu as { menu_file_type?: string | null }).menu_file_type ??
            null) as "pdf" | "image" | null,
        };

        return new Response(JSON.stringify(shaped), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
