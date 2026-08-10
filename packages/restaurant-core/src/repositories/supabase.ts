import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  RestaurantRepositoryUnavailableError,
  storedMenuItemSchema,
  type PublishedMenuScope,
  type RestaurantLookup,
  type RestaurantMenuLookup,
  type RestaurantRepository,
  type StoredMenuItem,
  type StoredRestaurant,
} from "../types.js";

const merchantRowSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  short_intro: z.string().nullable(),
  logo_url: z.string().url().nullable(),
  cover_image_url: z.string().url().nullable(),
  is_active: z.boolean(),
});

const menuRowSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  status: z.enum(["draft", "published", "paused"]),
  short_intro: z.string().nullable(),
  cover_image_url: z.string().url().nullable(),
  published_version_id: z.string().uuid().nullable(),
  menu_file_url: z.string().url().nullable(),
  menu_file_type: z.string().nullable(),
});

const itemRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  image_url: z.string().url().nullable(),
  alcoholic: z.boolean(),
  base_spirit: z.string().nullable(),
  flavor_tags: z.array(z.string()).nullable(),
  mood_tags: z.array(z.string()).nullable(),
  ingredients: z.array(z.string()).nullable(),
  allergens: z.array(z.string()).nullable(),
  recommendation_priority: z.number().int().nullable(),
  availability_status: z.enum(["active", "sold_out", "hidden"]),
  section: z.string().nullable(),
  sort_order: z.number().int().nullable(),
});

export interface SupabaseRestaurantRepositoryConfig {
  url: string;
  publishableKey: string;
}

export class SupabaseRestaurantRepository implements RestaurantRepository {
  private readonly client: SupabaseClient;

  constructor(config: SupabaseRestaurantRepositoryConfig, client?: SupabaseClient) {
    this.client =
      client ??
      createClient(config.url, config.publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      });
  }

  async listPublishedRestaurantMenus(): Promise<PublishedMenuScope[]> {
    const merchantsResult = await this.client
      .from("merchants")
      .select("id, slug, name, short_intro, logo_url, cover_image_url, is_active")
      .eq("is_active", true);
    if (merchantsResult.error) throw unavailable(merchantsResult.error.message);
    const merchantRows = z.array(merchantRowSchema).parse(merchantsResult.data ?? []);
    const scopes = await Promise.all(merchantRows.map(async (merchant) => {
      const menusResult = await this.client
        .from("menus")
        .select("slug")
        .eq("merchant_id", merchant.id)
        .eq("status", "published")
        .not("published_version_id", "is", null);
      if (menusResult.error) throw unavailable(menusResult.error.message);
      const menuSlugs = z.array(z.object({ slug: z.string() })).parse(menusResult.data ?? []);
      return Promise.all(menuSlugs.map(({ slug }) => this.lookupMenu(merchant.slug, slug)));
    }));
    return scopes.flat().flatMap((lookup) => lookup.kind === "ok" ? [lookup] : []);
  }

  async lookupRestaurant(merchantSlug: string): Promise<RestaurantLookup> {
    const merchantResult = await this.client
      .from("merchants")
      .select("id, slug, name, short_intro, logo_url, cover_image_url, is_active")
      .eq("slug", merchantSlug)
      .maybeSingle();
    if (merchantResult.error) throw unavailable(merchantResult.error.message);
    if (!merchantResult.data) return { kind: "merchant_not_found" };
    const merchant = merchantRowSchema.parse(merchantResult.data);
    if (!merchant.is_active) return { kind: "merchant_inactive" };
    const scopes = (await this.listPublishedRestaurantMenus()).filter(
      (scope) => scope.restaurant.id === merchant.id,
    );
    const restaurant = scopes[0]?.restaurant ?? mapRestaurant(merchant);
    return { kind: "ok", restaurant, menus: scopes.map((scope) => scope.menu) };
  }

  async lookupMenu(merchantSlug: string, menuSlug: string): Promise<RestaurantMenuLookup> {
    const merchantResult = await this.client
      .from("merchants")
      .select("id, slug, name, short_intro, logo_url, cover_image_url, is_active")
      .eq("slug", merchantSlug)
      .maybeSingle();
    if (merchantResult.error) throw unavailable(merchantResult.error.message);
    if (!merchantResult.data) return { kind: "merchant_not_found" };

    const merchantRow = merchantRowSchema.parse(merchantResult.data);
    if (!merchantRow.is_active) return { kind: "merchant_inactive" };

    const menuResult = await this.client
      .from("menus")
      .select("id, slug, name, status, short_intro, cover_image_url, published_version_id, menu_file_url, menu_file_type")
      .eq("merchant_id", merchantRow.id)
      .eq("slug", menuSlug)
      .maybeSingle();
    if (menuResult.error) throw unavailable(menuResult.error.message);
    if (!menuResult.data) return { kind: "menu_not_found" };

    const menuRow = menuRowSchema.parse(menuResult.data);
    if (menuRow.status !== "published" || !menuRow.published_version_id) {
      return { kind: "menu_unpublished" };
    }

    const versionResult = await this.client
      .from("menu_versions")
      .select("id")
      .eq("id", menuRow.published_version_id)
      .maybeSingle();
    if (versionResult.error) throw unavailable(versionResult.error.message);
    if (!versionResult.data) return { kind: "menu_unpublished" };

    const itemsResult = await this.client
      .from("menu_items")
      .select(
        "id, name, description, image_url, alcoholic, base_spirit, flavor_tags, mood_tags, ingredients, allergens, recommendation_priority, availability_status, section, sort_order",
      )
      .eq("menu_id", menuRow.id)
      .order("sort_order", { ascending: true });
    if (itemsResult.error) throw unavailable(itemsResult.error.message);

    const items = z.array(itemRowSchema).parse(itemsResult.data ?? []).map(mapItem);
    const restaurant = mapRestaurant(merchantRow);
    const menu = {
      id: menuRow.id,
      slug: menuRow.slug,
      name: menuRow.name,
      status: menuRow.status,
      publishedVersionId: menuRow.published_version_id,
      shortIntro: menuRow.short_intro,
      coverImageUrl: menuRow.cover_image_url,
      fullMenuUrl: menuRow.menu_file_url,
      fullMenuType:
        menuRow.menu_file_type === "pdf" || menuRow.menu_file_type === "image"
          ? menuRow.menu_file_type
          : null,
      items,
    } as const;

    return { kind: "ok", restaurant, menu };
  }

  async getCurrentMenuItem(menuId: string, itemId: string): Promise<StoredMenuItem | null> {
    const result = await this.client
      .from("menu_items")
      .select(
        "id, name, description, image_url, alcoholic, base_spirit, flavor_tags, mood_tags, ingredients, allergens, recommendation_priority, availability_status, section, sort_order",
      )
      .eq("menu_id", menuId)
      .eq("id", itemId)
      .maybeSingle();
    if (result.error) throw unavailable(result.error.message);
    return result.data ? mapItem(itemRowSchema.parse(result.data)) : null;
  }
}

function mapRestaurant(row: z.infer<typeof merchantRowSchema>): StoredRestaurant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortIntro: row.short_intro,
    logoUrl: row.logo_url,
    coverImageUrl: row.cover_image_url,
    isActive: row.is_active,
    menus: [],
  };
}

function mapItem(row: z.infer<typeof itemRowSchema>): StoredMenuItem {
  return storedMenuItemSchema.parse({
    id: row.id,
    name: row.name,
    description: row.description,
    price: null,
    imageUrl: row.image_url,
    alcoholic: row.alcoholic,
    baseSpirit: row.base_spirit,
    flavorTags: row.flavor_tags ?? [],
    moodTags: row.mood_tags ?? [],
    ingredients: row.ingredients ?? [],
    allergens: row.allergens ?? [],
    recommendationPriority: row.recommendation_priority ?? 0,
    availabilityStatus: row.availability_status,
    section: row.section,
    sortOrder: row.sort_order ?? 0,
  });
}

function unavailable(message: string): RestaurantRepositoryUnavailableError {
  return new RestaurantRepositoryUnavailableError(`Supabase restaurant read failed: ${message}`);
}
