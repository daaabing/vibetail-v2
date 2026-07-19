// Public menu reads — anon-safe. Uses the publishable key + RLS policies
// ("Anyone can view published menus / items of published menus").

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import type { PublicMenu, PublicMenuItem, MatchDimensions } from "@/lib/matching/types";

function makeClient() {
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

const InputSchema = z.object({
  merchantSlug: z.string().min(1),
  menuSlug: z.string().min(1),
});

function normalizeDimensions(raw: unknown): MatchDimensions {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const pick = (k: string): number | undefined => {
    const v = o[k];
    return typeof v === "number" && v >= 0 && v <= 1 ? v : undefined;
  };
  return {
    sweetness: pick("sweetness"),
    acidity: pick("acidity"),
    bitterness: pick("bitterness"),
    body: pick("body"),
    strength: pick("strength"),
  };
}

export const getPublishedMenu = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }): Promise<PublicMenu | null> => {
    const supabase = makeClient();

    const { data: merchant, error: merchErr } = await supabase
      .from("merchants")
      .select("id, slug, name, logo_url, cover_image_url, is_active")
      .eq("slug", data.merchantSlug)
      .eq("is_active", true)
      .maybeSingle();
    if (merchErr) throw new Error(merchErr.message);
    if (!merchant) return null;

    const { data: menu, error: menuErr } = await supabase
      .from("menus")
      .select(
        "id, slug, name, status, short_intro, cover_image_url, enabled_game_ids, game_display_order, published_version_id, menu_file_url, menu_file_type",
      )
      .eq("merchant_id", merchant.id)
      .eq("slug", data.menuSlug)
      .eq("status", "published")
      .maybeSingle();
    if (menuErr) throw new Error(menuErr.message);
    if (!menu || !menu.published_version_id) return null;

    const { data: version, error: verErr } = await supabase
      .from("menu_versions")
      .select("id, version_number")
      .eq("id", menu.published_version_id)
      .maybeSingle();
    if (verErr) throw new Error(verErr.message);
    if (!version) return null;

    // Live items: hide items marked hidden; keep sold_out visible so users
    // can see it grayed out if the UI wants to, and so refreshIfStale works.
    const { data: items, error: itemsErr } = await supabase
      .from("menu_items")
      .select(
        "id, name, description, ingredients, image_url, alcoholic, base_spirit, flavor_tags, mood_tags, dimensions, allergens, recommendation_priority, availability_status, section, sort_order",
      )
      .eq("menu_id", menu.id)
      .in("availability_status", ["active", "sold_out"])
      .order("sort_order", { ascending: true });
    if (itemsErr) throw new Error(itemsErr.message);

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
      dimensions: normalizeDimensions(row.dimensions),
      allergens: row.allergens ?? [],
      recommendationPriority: row.recommendation_priority ?? 0,
      availabilityStatus: row.availability_status as "active" | "sold_out",
      section: row.section,
    }));

    return {
      merchantId: merchant.id,
      merchantSlug: merchant.slug,
      merchantName: merchant.name,
      merchantLogoUrl: merchant.logo_url,
      merchantCoverUrl: merchant.cover_image_url,
      menuId: menu.id,
      menuSlug: menu.slug,
      menuName: menu.name,
      menuVersionId: version.id,
      menuVersionNumber: version.version_number,
      shortIntro: menu.short_intro,
      coverImageUrl: menu.cover_image_url,
      enabledGameIds: menu.enabled_game_ids ?? [],
      gameDisplayOrder: menu.game_display_order ?? [],
      hasAlcoholic: mapped.some((i) => i.alcoholic && i.availabilityStatus === "active"),
      items: mapped,
    };
  });
