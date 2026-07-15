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
    .select("id, slug, name, status, enabled_game_ids, published_version_id")
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

function buildPrompt(input: MatchBody, items: PublicMenuItem[]): { system: string; user: string; names: string[] } {
  const mood = input.mood?.trim() || "(no mood given)";
  const flavors = (input.selectedFlavors ?? []).join(", ") || "(no flavor tags)";
  const pref = input.customPreference?.trim() || "(no custom preference)";
  const isZh = input.lang === "zh";
  const langRule = isZh
    ? `OUTPUT LANGUAGE: Simplified Chinese for tastesLike / flavorProfile / whyThisMatch / roast. 'matchedName' MUST stay in the original menu name. 'category' stays English.`
    : `OUTPUT LANGUAGE: English.`;
  const menuBlock = items
    .map((c) => `- [${c.section ?? "menu"}] "${c.name}" — ${c.ingredients.join(", ")}`)
    .join("\n");
  const names = items.map((i) => i.name);
  return {
    names,
    system:
      "You are a witty cocktail sommelier who matches guests to a venue's existing menu. You always respond with valid JSON matching the provided schema and NEVER invent items outside the menu.",
    user: [
      langRule,
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
      `Rules:`,
      `- 'matchedName' MUST be one of the menu names above, spelled EXACTLY.`,
      `- 'vibeName' is a creative, vibe-driven title for the card front — NOT the menu name. 2-4 words.`,
      `- Weigh both flavor compatibility AND emotional fit.`,
      `- 'tastesLike' and 'whyThisMatch' should reference REAL ingredients of the matched drink, tied to the user's vibe.`,
      `- 'roast' is one sharp witty one-liner about the user's vibe, 12 words or fewer.`,
      `- Write positive fields ('tastesLike','whyThisMatch') warmly — celebrate the match; save the bite for 'roast' only.`,
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
        if (loaded.items.length === 0) return new Response("Menu has no active items", { status: 409 });

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

        const menuItem =
          loaded.items.find((c) => c.name.toLowerCase() === parsed.matchedName.toLowerCase()) ??
          loaded.items[0];

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
                rank: 1,
                score: 1,
                reason: parsed.whyThisMatch,
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
        };

        return new Response(JSON.stringify(shaped), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
