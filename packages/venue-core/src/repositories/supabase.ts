import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "./database.types.js";
import {
  VenueRepositoryUnavailableError,
  storedMenuItemSchema,
  type PublishedMenuScope,
  type VenueLookup,
  type VenueMenuLookup,
  type VenueRepository,
  type StoredMenuItem,
  type StoredVenue,
} from "../types.js";

const merchantRowSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  short_intro: z.string().nullable(),
  logo_url: z.string().url().nullable(),
  cover_image_url: z.string().url().nullable(),
  is_active: z.boolean(),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
});

const menuRowSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  status: z.enum(["draft", "published", "paused", "archived"]),
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

const menuDrinkRowSchema = z.object({
  sort_order: z.number().int().nullable(),
  drinks: z.object({
    id: z.string().uuid(),
    name: z.string(),
    description: z.string().nullable(),
    price: z.string().nullable(),
    image_url: z.string().url().nullable(),
    ingredients: z.array(z.string()).nullable(),
    flavor_tags: z.array(z.string()).nullable(),
    allergens: z.array(z.string()).nullable(),
    base_spirit: z.string().nullable(),
    alcoholic: z.boolean(),
    availability_status: z.enum(["active", "sold_out", "hidden"]),
  }).nullable(),
});

const DRINK_ITEM_COLUMNS =
  "sort_order, drinks:drink_id(id, name, description, price, image_url, ingredients, flavor_tags, allergens, base_spirit, alcoholic, availability_status)";

export interface SupabaseVenueRepositoryConfig {
  url: string;
  publishableKey: string;
}

export class SupabaseVenueRepository implements VenueRepository {
  private readonly client: SupabaseClient<Database>;

  constructor(config: SupabaseVenueRepositoryConfig, client?: SupabaseClient<Database>) {
    this.client =
      client ??
      createClient<Database>(config.url, config.publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      });
  }

  async listPublishedVenueMenus(): Promise<PublishedMenuScope[]> {
    // Without an explicit order Postgres returns rows in arbitrary order, so
    // the public directory would reshuffle between requests. Slug order is
    // stable and human-predictable.
    const merchantsResult = await this.client
      .from("merchants")
      .select("id, slug, name, short_intro, logo_url, cover_image_url, is_active, latitude, longitude")
      .eq("is_active", true)
      .order("slug", { ascending: true });
    if (merchantsResult.error) throw unavailable(merchantsResult.error.message);
    const merchantRows = z.array(merchantRowSchema).parse(merchantsResult.data ?? []);
    const scopes = await Promise.all(merchantRows.map(async (merchant) => {
      const menusResult = await this.client
        .from("menus")
        .select("slug")
        .eq("merchant_id", merchant.id)
        .eq("status", "published")
        .not("published_version_id", "is", null)
        .order("slug", { ascending: true });
      if (menusResult.error) throw unavailable(menusResult.error.message);
      const menuSlugs = z.array(z.object({ slug: z.string() })).parse(menusResult.data ?? []);
      return Promise.all(menuSlugs.map(({ slug }) => this.lookupMenu(merchant.slug, slug)));
    }));
    return scopes.flat().flatMap((lookup) => lookup.kind === "ok" ? [lookup] : []);
  }

  async lookupVenue(merchantSlug: string): Promise<VenueLookup> {
    const merchantResult = await this.client
      .from("merchants")
      .select("id, slug, name, short_intro, logo_url, cover_image_url, is_active, latitude, longitude")
      .eq("slug", merchantSlug)
      .maybeSingle();
    if (merchantResult.error) throw unavailable(merchantResult.error.message);
    if (!merchantResult.data) return { kind: "merchant_not_found" };
    const merchant = merchantRowSchema.parse(merchantResult.data);
    if (!merchant.is_active) return { kind: "merchant_inactive" };
    const scopes = (await this.listPublishedVenueMenus()).filter(
      (scope) => scope.venue.id === merchant.id,
    );
    const venue = scopes[0]?.venue ?? mapVenue(merchant);
    return { kind: "ok", venue, menus: scopes.map((scope) => scope.menu) };
  }

  async lookupMenu(merchantSlug: string, menuSlug: string): Promise<VenueMenuLookup> {
    const merchantResult = await this.client
      .from("merchants")
      .select("id, slug, name, short_intro, logo_url, cover_image_url, is_active, latitude, longitude")
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

    // Menus authored in the venue backend derive their items from the drink
    // library; legacy menus keep menu_items. Both sources merge here.
    const drinkItemsResult = await this.client
      .from("menu_drinks")
      .select(DRINK_ITEM_COLUMNS)
      .eq("menu_id", menuRow.id);
    if (drinkItemsResult.error) throw unavailable(drinkItemsResult.error.message);

    const legacyItems = z.array(itemRowSchema).parse(itemsResult.data ?? []).map(mapItem);
    const drinkItems = z.array(menuDrinkRowSchema).parse(drinkItemsResult.data ?? [])
      .flatMap((row) => (row.drinks ? [mapDrinkItem(row.drinks, row.sort_order ?? 0)] : []));
    const items = [...legacyItems, ...drinkItems].sort((left, right) => left.sortOrder - right.sortOrder);
    const venue = mapVenue(merchantRow);
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

    return { kind: "ok", venue, menu };
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
    if (result.data) return mapItem(itemRowSchema.parse(result.data));

    // Drink-backed fallback: the item id is a drink id joined via menu_drinks.
    const drinkResult = await this.client
      .from("menu_drinks")
      .select(DRINK_ITEM_COLUMNS)
      .eq("menu_id", menuId)
      .eq("drink_id", itemId)
      .maybeSingle();
    if (drinkResult.error) throw unavailable(drinkResult.error.message);
    if (!drinkResult.data) return null;
    const row = menuDrinkRowSchema.parse(drinkResult.data);
    return row.drinks ? mapDrinkItem(row.drinks, row.sort_order ?? 0) : null;
  }
}

function mapVenue(row: z.infer<typeof merchantRowSchema>): StoredVenue {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortIntro: row.short_intro,
    logoUrl: row.logo_url,
    coverImageUrl: row.cover_image_url,
    isActive: row.is_active,
    latitude: row.latitude,
    longitude: row.longitude,
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

function mapDrinkItem(
  drink: NonNullable<z.infer<typeof menuDrinkRowSchema>["drinks"]>,
  sortOrder: number,
): StoredMenuItem {
  return storedMenuItemSchema.parse({
    id: drink.id,
    name: drink.name,
    description: drink.description,
    price: drink.price,
    imageUrl: drink.image_url,
    alcoholic: drink.alcoholic,
    baseSpirit: drink.base_spirit,
    flavorTags: drink.flavor_tags ?? [],
    moodTags: [],
    ingredients: drink.ingredients ?? [],
    allergens: drink.allergens ?? [],
    recommendationPriority: 0,
    availabilityStatus: drink.availability_status,
    section: null,
    sortOrder,
  });
}

function unavailable(message: string): VenueRepositoryUnavailableError {
  return new VenueRepositoryUnavailableError(`Supabase venue read failed: ${message}`);
}
