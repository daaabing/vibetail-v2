import { createHash, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type {
  CreateMenuInput,
  MenuItemInput,
  UpdateAvailabilityInput,
  UpdateMenuInput,
  UpdateMerchantInput,
} from "@vibetail/contracts";
import type { ManagementRepository, StoredRestaurant } from "../types.js";
import type { Database, TablesUpdate } from "./database.types.js";

type MenuItemWrite = Pick<
  Database["public"]["Tables"]["menu_items"]["Insert"],
  | "name"
  | "section"
  | "ingredients"
  | "base_spirit"
  | "alcoholic"
  | "description"
  | "image_url"
  | "flavor_tags"
  | "mood_tags"
  | "allergens"
>;

export interface SupabaseManagementRepositoryConfig {
  url: string;
  serviceRoleKey: string;
}

/** Server-only compatibility adapter for the legacy private-token management flow. */
export class SupabaseManagementRepository implements ManagementRepository {
  private readonly client: SupabaseClient<Database>;

  constructor(config: SupabaseManagementRepositoryConfig, client?: SupabaseClient<Database>) {
    this.client = client ?? createClient<Database>(config.url, config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
  }

  async verifyManagementToken(token: string): Promise<string | null> {
    const digest = createHash("sha256").update(token).digest();
    const result = await this.client
      .from("merchant_access_tokens")
      .select("merchant_id, token_hash")
      .is("revoked_at", null);
    if (result.error) throw new Error(result.error.message);
    for (const row of result.data ?? []) {
      const stored = Buffer.from(String(row.token_hash), "hex");
      if (stored.length === digest.length && timingSafeEqual(stored, digest)) {
        return String(row.merchant_id);
      }
    }
    return null;
  }

  async getManagedMerchant(merchantId: string): Promise<StoredRestaurant | null> {
    const merchantResult = await this.client
      .from("merchants")
      .select("id, slug, name, short_intro, logo_url, cover_image_url, is_active")
      .eq("id", merchantId)
      .maybeSingle();
    if (merchantResult.error) throw new Error(merchantResult.error.message);
    if (!merchantResult.data) return null;

    const menusResult = await this.client
      .from("menus")
      .select("id, slug, name, status, short_intro, cover_image_url, published_version_id, menu_file_url, menu_file_type")
      .eq("merchant_id", merchantId)
      .order("updated_at", { ascending: false });
    if (menusResult.error) throw new Error(menusResult.error.message);

    const menus = await Promise.all((menusResult.data ?? []).map(async (menu) => {
      const itemsResult = await this.client
        .from("menu_items")
        .select("id, name, description, image_url, alcoholic, base_spirit, flavor_tags, mood_tags, ingredients, allergens, recommendation_priority, availability_status, section, sort_order")
        .eq("menu_id", menu.id)
        .order("sort_order", { ascending: true });
      if (itemsResult.error) throw new Error(itemsResult.error.message);
      return {
        id: String(menu.id), slug: String(menu.slug), name: String(menu.name),
        status: menu.status as "draft" | "published" | "paused",
        publishedVersionId: menu.published_version_id ? String(menu.published_version_id) : null,
        shortIntro: menu.short_intro ? String(menu.short_intro) : null,
        coverImageUrl: menu.cover_image_url ? String(menu.cover_image_url) : null,
        fullMenuUrl: menu.menu_file_url ? String(menu.menu_file_url) : null,
        fullMenuType: menu.menu_file_type === "pdf" || menu.menu_file_type === "image"
          ? menu.menu_file_type as "pdf" | "image"
          : null,
        items: (itemsResult.data ?? []).map((item) => ({
          id: String(item.id), name: String(item.name),
          description: item.description ? String(item.description) : null,
          price: null, imageUrl: item.image_url ? String(item.image_url) : null,
          alcoholic: Boolean(item.alcoholic), baseSpirit: item.base_spirit ? String(item.base_spirit) : null,
          flavorTags: asStrings(item.flavor_tags), moodTags: asStrings(item.mood_tags),
          ingredients: asStrings(item.ingredients), allergens: asStrings(item.allergens),
          recommendationPriority: Number(item.recommendation_priority ?? 0),
          availabilityStatus: item.availability_status as "active" | "sold_out" | "hidden",
          section: item.section ? String(item.section) : null, sortOrder: Number(item.sort_order ?? 0),
        })),
      };
    }));

    return {
      id: String(merchantResult.data.id), slug: String(merchantResult.data.slug),
      name: String(merchantResult.data.name),
      shortIntro: merchantResult.data.short_intro ? String(merchantResult.data.short_intro) : null,
      logoUrl: merchantResult.data.logo_url ? String(merchantResult.data.logo_url) : null,
      coverImageUrl: merchantResult.data.cover_image_url ? String(merchantResult.data.cover_image_url) : null,
      isActive: Boolean(merchantResult.data.is_active), menus,
    };
  }

  async updateMerchant(merchantId: string, input: UpdateMerchantInput): Promise<void> {
    const result = await this.client.from("merchants").update({
      name: input.name, short_intro: input.shortIntro, logo_url: input.logoUrl,
      cover_image_url: input.coverImageUrl, is_active: input.isActive,
    }).eq("id", merchantId);
    if (result.error) throw new Error(result.error.message);
  }

  async createMenu(merchantId: string, input: CreateMenuInput): Promise<string> {
    const result = await this.client.from("menus").insert({
      merchant_id: merchantId, name: input.name, slug: input.slug,
      short_intro: input.shortIntro, status: "draft",
      enabled_game_ids: ["mood-match"], game_display_order: ["mood-match"],
    }).select("id").single();
    if (result.error) throw new Error(result.error.message);
    return String(result.data.id);
  }

  async updateMenu(merchantId: string, menuId: string, input: UpdateMenuInput): Promise<void> {
    await this.requireMenuOwner(merchantId, menuId);
    const update: TablesUpdate<"menus"> = {
      name: input.name, slug: input.slug, short_intro: input.shortIntro,
    };
    if (input.status) update.status = input.status;
    const result = await this.client.from("menus").update(update).eq("id", menuId);
    if (result.error) throw new Error(result.error.message);
  }

  async publishMenu(merchantId: string, menuId: string): Promise<void> {
    await this.requireMenuOwner(merchantId, menuId);
    const items = await this.client.from("menu_items").select("*").eq("menu_id", menuId).eq("availability_status", "active");
    if (items.error) throw new Error(items.error.message);
    if (!items.data?.length) throw new Error("Add at least one active item before publishing");
    const latest = await this.client.from("menu_versions").select("version_number").eq("menu_id", menuId)
      .order("version_number", { ascending: false }).limit(1).maybeSingle();
    if (latest.error) throw new Error(latest.error.message);
    const menu = await this.client.from("menus").select("*").eq("id", menuId).single();
    if (menu.error) throw new Error(menu.error.message);
    const version = await this.client.from("menu_versions").insert({
      menu_id: menuId, version_number: Number(latest.data?.version_number ?? 0) + 1,
      snapshot: { menu: menu.data, items: items.data },
    }).select("id").single();
    if (version.error) throw new Error(version.error.message);
    const update = await this.client.from("menus").update({ status: "published", published_version_id: version.data.id }).eq("id", menuId);
    if (update.error) throw new Error(update.error.message);
  }

  async createMenuItem(merchantId: string, menuId: string, input: MenuItemInput): Promise<string> {
    await this.requireMenuOwner(merchantId, menuId);
    const latest = await this.client.from("menu_items").select("sort_order").eq("menu_id", menuId)
      .order("sort_order", { ascending: false }).limit(1).maybeSingle();
    if (latest.error) throw new Error(latest.error.message);
    const result = await this.client.from("menu_items").insert({
      menu_id: menuId, ...itemWrite(input), sort_order: Number(latest.data?.sort_order ?? 0) + 10,
      availability_status: "active",
    }).select("id").single();
    if (result.error) throw new Error(result.error.message);
    return String(result.data.id);
  }

  async updateMenuItem(merchantId: string, menuItemId: string, input: MenuItemInput): Promise<void> {
    await this.requireItemOwner(merchantId, menuItemId);
    const result = await this.client.from("menu_items").update(itemWrite(input)).eq("id", menuItemId);
    if (result.error) throw new Error(result.error.message);
  }

  async updateMenuItemAvailability(merchantId: string, menuItemId: string, input: UpdateAvailabilityInput): Promise<void> {
    await this.requireItemOwner(merchantId, menuItemId);
    const result = await this.client.from("menu_items").update({ availability_status: input.availabilityStatus }).eq("id", menuItemId);
    if (result.error) throw new Error(result.error.message);
  }

  private async requireMenuOwner(merchantId: string, menuId: string): Promise<void> {
    const result = await this.client.from("menus").select("merchant_id").eq("id", menuId).maybeSingle();
    if (result.error) throw new Error(result.error.message);
    if (result.data?.merchant_id !== merchantId) throw new Error("Forbidden");
  }

  private async requireItemOwner(merchantId: string, itemId: string): Promise<void> {
    const result = await this.client.from("menu_items").select("menu_id, menus:menu_id(merchant_id)").eq("id", itemId).maybeSingle();
    if (result.error) throw new Error(result.error.message);
    const owner = (result.data?.menus as unknown as { merchant_id?: string } | null)?.merchant_id;
    if (owner !== merchantId) throw new Error("Forbidden");
  }
}

function itemWrite(input: MenuItemInput): MenuItemWrite {
  return {
    name: input.name, section: input.section, ingredients: input.ingredients,
    base_spirit: input.baseSpirit, alcoholic: input.alcoholic,
    description: input.description ?? "", image_url: input.imageUrl,
    flavor_tags: input.flavorTags, mood_tags: input.moodTags,
    allergens: input.allergens,
  };
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}
