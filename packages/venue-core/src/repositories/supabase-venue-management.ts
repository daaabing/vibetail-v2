import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DrinkInput, VenueType } from "@vibetail/contracts";
import type {
  CreateFeedbackOutcome,
  CreateVenueRecord,
  RecordMatchEventInput,
  StoredDrink,
  StoredFeedbackEntry,
  StoredMatchEvent,
  StoredVenueAccount,
  StoredVenueAdminMenu,
  StoredVenueProfile,
  UpdateVenueProfileRecord,
  VenueManagementRepository,
  VenueMenuRecordInput,
} from "../types.js";
import type { VerifiedIdentity } from "../identity.js";
import type { Database, Tables } from "./database.types.js";

const ACCOUNT_COLUMNS = "id, name_normalized, display_name, merchant_id, auth_user_id, email";

export interface SupabaseVenueManagementRepositoryConfig {
  url: string;
  serviceRoleKey: string;
}

/** Server-only adapter for the account-based venue backend ("manage v2"). */
export class SupabaseVenueManagementRepository implements VenueManagementRepository {
  private readonly client: SupabaseClient<Database>;

  constructor(config: SupabaseVenueManagementRepositoryConfig, client?: SupabaseClient<Database>) {
    this.client = client ?? createClient<Database>(config.url, config.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
  }

  async findOrCreateAccount(nameNormalized: string, displayName: string): Promise<StoredVenueAccount> {
    const existing = await this.client
      .from("venue_accounts")
      .select("id, name_normalized, display_name, merchant_id")
      .eq("name_normalized", nameNormalized)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data) return mapAccount(existing.data);

    const inserted = await this.client
      .from("venue_accounts")
      .insert({ name_normalized: nameNormalized, display_name: displayName })
      .select("id, name_normalized, display_name, merchant_id")
      .single();
    if (inserted.error) {
      // Lost a create race: another request inserted the same name first.
      if (inserted.error.code === "23505") {
        const retry = await this.client
          .from("venue_accounts")
          .select("id, name_normalized, display_name, merchant_id")
          .eq("name_normalized", nameNormalized)
          .single();
        if (retry.error) throw new Error(retry.error.message);
        return mapAccount(retry.data);
      }
      throw new Error(inserted.error.message);
    }
    return mapAccount(inserted.data);
  }

  async findOrCreateAccountByIdentity(identity: VerifiedIdentity): Promise<StoredVenueAccount> {
    const existing = await this.client
      .from("venue_accounts")
      .select(ACCOUNT_COLUMNS)
      .eq("auth_user_id", identity.authUserId)
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (existing.data) return this.refreshProfile(existing.data, identity);

    // name_normalized stays NOT NULL for legacy rows, so identity accounts fill
    // it with their email and fall back to the auth id if that name is taken.
    const inserted = await this.insertIdentityAccount(
      identity,
      identity.email?.toLowerCase() ?? identity.authUserId,
    );
    if (inserted) return inserted;

    // A 23505 means either a concurrent first sign-in or a legacy row already
    // holding that name. Re-read first; only the name case still needs an insert.
    const raced = await this.client
      .from("venue_accounts")
      .select(ACCOUNT_COLUMNS)
      .eq("auth_user_id", identity.authUserId)
      .maybeSingle();
    if (raced.error) throw new Error(raced.error.message);
    if (raced.data) return this.refreshProfile(raced.data, identity);

    const fallback = await this.insertIdentityAccount(identity, identity.authUserId);
    if (!fallback) throw new Error("Could not create an account for this identity");
    return fallback;
  }

  private async insertIdentityAccount(
    identity: VerifiedIdentity,
    nameNormalized: string,
  ): Promise<StoredVenueAccount | null> {
    const inserted = await this.client
      .from("venue_accounts")
      .insert({
        auth_user_id: identity.authUserId,
        email: identity.email,
        display_name: identity.displayName,
        name_normalized: nameNormalized,
      })
      .select(ACCOUNT_COLUMNS)
      .single();
    if (inserted.error) {
      if (inserted.error.code === "23505") return null;
      throw new Error(inserted.error.message);
    }
    return mapAccount(inserted.data);
  }

  /** Keeps the stored profile in step with the provider on every sign-in. */
  private async refreshProfile(
    row: AccountRow,
    identity: VerifiedIdentity,
  ): Promise<StoredVenueAccount> {
    const account = mapAccount(row);
    if (account.displayName === identity.displayName && account.email === identity.email) {
      return account;
    }
    const updated = await this.client
      .from("venue_accounts")
      .update({ display_name: identity.displayName, email: identity.email })
      .eq("id", account.id)
      .select(ACCOUNT_COLUMNS)
      .single();
    // A failed refresh is cosmetic: the caller still has a usable account.
    return updated.error ? account : mapAccount(updated.data);
  }

  async createVenueSession(accountId: string, tokenHash: string): Promise<void> {
    const result = await this.client
      .from("venue_sessions")
      .insert({ account_id: accountId, token_hash: tokenHash });
    if (result.error) throw new Error(result.error.message);
  }

  async verifyVenueSession(tokenHash: string): Promise<StoredVenueAccount | null> {
    const result = await this.client
      .from("venue_sessions")
      .select("revoked_at, venue_accounts:account_id(id, name_normalized, display_name, merchant_id)")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (result.error) throw new Error(result.error.message);
    if (!result.data || result.data.revoked_at) return null;
    const account = result.data.venue_accounts as unknown as Tables<"venue_accounts"> | null;
    return account ? mapAccount(account) : null;
  }

  async revokeVenueSession(tokenHash: string): Promise<void> {
    const result = await this.client
      .from("venue_sessions")
      .update({ revoked_at: new Date().toISOString() })
      .eq("token_hash", tokenHash);
    if (result.error) throw new Error(result.error.message);
  }

  async createVenue(accountId: string, input: CreateVenueRecord): Promise<string> {
    const account = await this.client
      .from("venue_accounts")
      .select("id, merchant_id")
      .eq("id", accountId)
      .maybeSingle();
    if (account.error) throw new Error(account.error.message);
    if (!account.data) throw new Error("Account not found");
    if (account.data.merchant_id) throw new Error("Venue already exists");

    const slug = await this.uniqueMerchantSlug(input.slugBase);
    const merchant = await this.client
      .from("merchants")
      .insert({
        slug,
        name: input.name,
        short_intro: input.shortIntro,
        address: input.address,
        venue_type: input.venueType,
        is_active: true,
      })
      .select("id")
      .single();
    if (merchant.error) throw new Error(merchant.error.message);

    const link = await this.client
      .from("venue_accounts")
      .update({ merchant_id: merchant.data.id })
      .eq("id", accountId);
    if (link.error) throw new Error(link.error.message);
    return String(merchant.data.id);
  }

  async getVenueProfile(merchantId: string): Promise<StoredVenueProfile | null> {
    const result = await this.client
      .from("merchants")
      .select("id, slug, name, short_intro, is_active, address, venue_type")
      .eq("id", merchantId)
      .maybeSingle();
    if (result.error) throw new Error(result.error.message);
    if (!result.data) return null;
    return {
      id: String(result.data.id),
      slug: String(result.data.slug),
      name: String(result.data.name),
      shortIntro: result.data.short_intro ? String(result.data.short_intro) : null,
      isActive: Boolean(result.data.is_active),
      address: result.data.address ? String(result.data.address) : null,
      venueType: (result.data.venue_type as VenueType | null) ?? null,
    };
  }

  async updateVenueProfile(merchantId: string, input: UpdateVenueProfileRecord): Promise<void> {
    const result = await this.client
      .from("merchants")
      .update({
        name: input.name,
        short_intro: input.shortIntro,
        address: input.address,
        venue_type: input.venueType,
      })
      .eq("id", merchantId);
    if (result.error) throw new Error(result.error.message);
  }

  async listDrinks(merchantId: string): Promise<StoredDrink[]> {
    const result = await this.client
      .from("drinks")
      .select(DRINK_COLUMNS)
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: true });
    if (result.error) throw new Error(result.error.message);
    return (result.data ?? []).map(mapDrink);
  }

  async createDrink(merchantId: string, input: DrinkInput): Promise<string> {
    const result = await this.client
      .from("drinks")
      .insert({ merchant_id: merchantId, ...drinkWrite(input) })
      .select("id")
      .single();
    if (result.error) throw new Error(result.error.message);
    return String(result.data.id);
  }

  async updateDrink(merchantId: string, drinkId: string, input: DrinkInput): Promise<void> {
    await this.requireDrinkOwner(merchantId, drinkId);
    const result = await this.client
      .from("drinks")
      .update({ ...drinkWrite(input), updated_at: new Date().toISOString() })
      .eq("id", drinkId);
    if (result.error) throw new Error(result.error.message);
  }

  async deleteDrink(merchantId: string, drinkId: string): Promise<number> {
    await this.requireDrinkOwner(merchantId, drinkId);
    const refs = await this.client
      .from("menu_drinks")
      .select("menu_id")
      .eq("drink_id", drinkId);
    if (refs.error) throw new Error(refs.error.message);
    const removedFromMenus = new Set((refs.data ?? []).map((row) => String(row.menu_id))).size;
    const result = await this.client.from("drinks").delete().eq("id", drinkId);
    if (result.error) throw new Error(result.error.message);
    return removedFromMenus;
  }

  async listDrinkMenuRefs(merchantId: string, drinkId: string): Promise<StoredVenueAdminMenu[]> {
    await this.requireDrinkOwner(merchantId, drinkId);
    const refs = await this.client
      .from("menu_drinks")
      .select("menu_id")
      .eq("drink_id", drinkId);
    if (refs.error) throw new Error(refs.error.message);
    const menuIds = new Set((refs.data ?? []).map((row) => String(row.menu_id)));
    return (await this.listVenueMenus(merchantId)).filter((menu) => menuIds.has(menu.id));
  }

  async listVenueMenus(merchantId: string): Promise<StoredVenueAdminMenu[]> {
    const menus = await this.client
      .from("menus")
      .select("id, slug, name, status")
      .eq("merchant_id", merchantId)
      .order("updated_at", { ascending: false });
    if (menus.error) throw new Error(menus.error.message);
    const menuRows = menus.data ?? [];
    if (menuRows.length === 0) return [];

    const refs = await this.client
      .from("menu_drinks")
      .select("menu_id, drink_id, sort_order")
      .in("menu_id", menuRows.map((row) => String(row.id)));
    if (refs.error) throw new Error(refs.error.message);
    const byMenu = new Map<string, Array<{ drinkId: string; sortOrder: number }>>();
    for (const ref of refs.data ?? []) {
      const key = String(ref.menu_id);
      const list = byMenu.get(key) ?? [];
      list.push({ drinkId: String(ref.drink_id), sortOrder: Number(ref.sort_order ?? 0) });
      byMenu.set(key, list);
    }
    return menuRows.map((row) => ({
      id: String(row.id),
      slug: String(row.slug),
      name: String(row.name),
      status: row.status as StoredVenueAdminMenu["status"],
      drinkIds: (byMenu.get(String(row.id)) ?? [])
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((ref) => ref.drinkId),
    }));
  }

  async createVenueMenu(merchantId: string, input: VenueMenuRecordInput): Promise<string> {
    await this.requireOwnDrinks(merchantId, input.drinkIds);
    const slug = await this.uniqueMenuSlug(merchantId, input.slugBase);
    const menu = await this.client
      .from("menus")
      .insert({
        merchant_id: merchantId,
        name: input.name,
        slug,
        status: "draft",
      })
      .select("id")
      .single();
    if (menu.error) throw new Error(menu.error.message);
    const menuId = String(menu.data.id);
    await this.replaceMenuDrinks(menuId, input.drinkIds);
    return menuId;
  }

  async updateVenueMenu(
    merchantId: string,
    menuId: string,
    input: { name?: string; drinkIds?: readonly string[] },
  ): Promise<void> {
    await this.requireMenuOwner(merchantId, menuId);
    if (input.name !== undefined) {
      const result = await this.client.from("menus").update({ name: input.name }).eq("id", menuId);
      if (result.error) throw new Error(result.error.message);
    }
    if (input.drinkIds !== undefined) {
      await this.requireOwnDrinks(merchantId, input.drinkIds);
      await this.replaceMenuDrinks(menuId, input.drinkIds);
    }
  }

  async deleteVenueMenu(merchantId: string, menuId: string): Promise<void> {
    await this.requireMenuOwner(merchantId, menuId);
    // Break the menus.published_version_id ↔ menu_versions.menu_id cycle first.
    const unlink = await this.client.from("menus").update({ published_version_id: null }).eq("id", menuId);
    if (unlink.error) throw new Error(unlink.error.message);
    const versions = await this.client.from("menu_versions").delete().eq("menu_id", menuId);
    if (versions.error) throw new Error(versions.error.message);
    const result = await this.client.from("menus").delete().eq("id", menuId);
    if (result.error) throw new Error(result.error.message);
  }

  async publishVenueMenu(merchantId: string, menuId: string): Promise<void> {
    await this.requireMenuOwner(merchantId, menuId);
    const refs = await this.client
      .from("menu_drinks")
      .select("sort_order, drinks:drink_id(*)")
      .eq("menu_id", menuId);
    if (refs.error) throw new Error(refs.error.message);
    const activeDrinks = (refs.data ?? [])
      .map((row) => row.drinks as unknown as Tables<"drinks"> | null)
      .filter((drink): drink is Tables<"drinks"> => Boolean(drink && drink.availability_status === "active"));
    if (activeDrinks.length === 0) {
      throw new Error("Add at least one active drink before publishing");
    }

    const menu = await this.client.from("menus").select("*").eq("id", menuId).single();
    if (menu.error) throw new Error(menu.error.message);
    const latest = await this.client
      .from("menu_versions")
      .select("version_number")
      .eq("menu_id", menuId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest.error) throw new Error(latest.error.message);
    const version = await this.client
      .from("menu_versions")
      .insert({
        menu_id: menuId,
        version_number: Number(latest.data?.version_number ?? 0) + 1,
        snapshot: { menu: menu.data, drinks: activeDrinks },
      })
      .select("id")
      .single();
    if (version.error) throw new Error(version.error.message);

    const archive = await this.client
      .from("menus")
      .update({ status: "archived" })
      .eq("merchant_id", merchantId)
      .eq("status", "published")
      .neq("id", menuId);
    if (archive.error) throw new Error(archive.error.message);

    const update = await this.client
      .from("menus")
      .update({ status: "published", published_version_id: version.data.id })
      .eq("id", menuId);
    if (update.error) throw new Error(update.error.message);
  }

  async recordMenuView(merchantSlug: string, menuId: string | null): Promise<void> {
    const merchant = await this.client
      .from("merchants")
      .select("id")
      .eq("slug", merchantSlug)
      .maybeSingle();
    if (merchant.error) throw new Error(merchant.error.message);
    if (!merchant.data) return;
    const result = await this.client
      .from("menu_views")
      .insert({ merchant_id: merchant.data.id, menu_id: menuId });
    if (result.error) throw new Error(result.error.message);
  }

  async recordMatchEvent(event: RecordMatchEventInput): Promise<string> {
    const result = await this.client
      .from("match_events")
      .insert({
        merchant_id: event.merchantId,
        menu_id: event.menuId,
        item_id: event.itemId,
        item_name: event.itemName,
        trace_id: event.traceId,
        account_id: event.accountId ?? null,
      })
      .select("id")
      .single();
    if (result.error) throw new Error(result.error.message);
    return String(result.data.id);
  }

  async createFeedback(
    matchId: string,
    rating: number,
    comment: string | null,
    accountId: string | null = null,
  ): Promise<CreateFeedbackOutcome> {
    const match = await this.client
      .from("match_events")
      .select("id, merchant_id")
      .eq("id", matchId)
      .maybeSingle();
    if (match.error) throw new Error(match.error.message);
    if (!match.data) return "match_not_found";

    const result = await this.client
      .from("match_feedback")
      .insert({
        match_id: matchId,
        merchant_id: match.data.merchant_id,
        rating,
        comment,
        account_id: accountId,
      });
    if (result.error) {
      if (result.error.code === "23505") return "duplicate";
      throw new Error(result.error.message);
    }
    return "created";
  }

  async countMenuViews(merchantId: string, sinceIso: string): Promise<number> {
    const result = await this.client
      .from("menu_views")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchantId)
      .gte("created_at", sinceIso);
    if (result.error) throw new Error(result.error.message);
    return result.count ?? 0;
  }

  async listMatchEvents(merchantId: string, sinceIso: string, limit: number): Promise<StoredMatchEvent[]> {
    const result = await this.client
      .from("match_events")
      .select("id, merchant_id, menu_id, item_id, item_name, trace_id, created_at")
      .eq("merchant_id", merchantId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (result.error) throw new Error(result.error.message);
    return (result.data ?? []).map((row) => ({
      id: String(row.id),
      merchantId: String(row.merchant_id),
      menuId: row.menu_id ? String(row.menu_id) : null,
      itemId: String(row.item_id),
      itemName: String(row.item_name),
      traceId: String(row.trace_id),
      createdAt: String(row.created_at),
    }));
  }

  async listFeedback(merchantId: string, sinceIso: string, limit: number): Promise<StoredFeedbackEntry[]> {
    const result = await this.client
      .from("match_feedback")
      .select("id, rating, comment, created_at, match_events:match_id(item_name)")
      .eq("merchant_id", merchantId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (result.error) throw new Error(result.error.message);
    return (result.data ?? []).map((row) => ({
      id: String(row.id),
      rating: Number(row.rating),
      comment: row.comment ? String(row.comment) : null,
      itemName: String((row.match_events as unknown as { item_name?: string } | null)?.item_name ?? "Unknown drink"),
      createdAt: String(row.created_at),
    }));
  }

  private async requireMenuOwner(merchantId: string, menuId: string): Promise<void> {
    const result = await this.client.from("menus").select("merchant_id").eq("id", menuId).maybeSingle();
    if (result.error) throw new Error(result.error.message);
    if (result.data?.merchant_id !== merchantId) throw new Error("Forbidden");
  }

  private async requireDrinkOwner(merchantId: string, drinkId: string): Promise<void> {
    const result = await this.client.from("drinks").select("merchant_id").eq("id", drinkId).maybeSingle();
    if (result.error) throw new Error(result.error.message);
    if (result.data?.merchant_id !== merchantId) throw new Error("Drink not found or forbidden");
  }

  private async requireOwnDrinks(merchantId: string, drinkIds: readonly string[]): Promise<void> {
    if (drinkIds.length === 0) return;
    const result = await this.client
      .from("drinks")
      .select("id")
      .eq("merchant_id", merchantId)
      .in("id", [...drinkIds]);
    if (result.error) throw new Error(result.error.message);
    const owned = new Set((result.data ?? []).map((row) => String(row.id)));
    if (drinkIds.some((drinkId) => !owned.has(drinkId))) {
      throw new Error("Menu references an unknown drink");
    }
  }

  private async replaceMenuDrinks(menuId: string, drinkIds: readonly string[]): Promise<void> {
    const cleared = await this.client.from("menu_drinks").delete().eq("menu_id", menuId);
    if (cleared.error) throw new Error(cleared.error.message);
    if (drinkIds.length === 0) return;
    const inserted = await this.client.from("menu_drinks").insert(
      drinkIds.map((drinkId, index) => ({ menu_id: menuId, drink_id: drinkId, sort_order: (index + 1) * 10 })),
    );
    if (inserted.error) throw new Error(inserted.error.message);
  }

  private async uniqueMerchantSlug(slugBase: string): Promise<string> {
    const taken = await this.takenSlugs("merchants", slugBase);
    return firstFreeSlug(taken, slugBase);
  }

  private async uniqueMenuSlug(merchantId: string, slugBase: string): Promise<string> {
    const result = await this.client
      .from("menus")
      .select("slug")
      .eq("merchant_id", merchantId)
      .like("slug", `${slugBase}%`);
    if (result.error) throw new Error(result.error.message);
    return firstFreeSlug(new Set((result.data ?? []).map((row) => String(row.slug))), slugBase);
  }

  private async takenSlugs(table: "merchants", slugBase: string): Promise<Set<string>> {
    const result = await this.client
      .from(table)
      .select("slug")
      .like("slug", `${slugBase}%`);
    if (result.error) throw new Error(result.error.message);
    return new Set((result.data ?? []).map((row) => String(row.slug)));
  }
}

const DRINK_COLUMNS =
  "id, name, description, price, image_url, ingredients, flavor_tags, allergens, base_spirit, strength, alcoholic, recommendation_note, availability_status";

type AccountRow = Pick<
  Tables<"venue_accounts">,
  "id" | "name_normalized" | "display_name" | "merchant_id"
> & Partial<Pick<Tables<"venue_accounts">, "auth_user_id" | "email">>;

function mapAccount(row: AccountRow): StoredVenueAccount {
  return {
    id: String(row.id),
    nameNormalized: String(row.name_normalized),
    displayName: String(row.display_name),
    merchantId: row.merchant_id ? String(row.merchant_id) : null,
    authUserId: row.auth_user_id ? String(row.auth_user_id) : null,
    email: row.email ? String(row.email) : null,
  };
}

function mapDrink(row: Omit<Tables<"drinks">, "merchant_id" | "created_at" | "updated_at">): StoredDrink {
  return {
    id: String(row.id),
    name: String(row.name),
    description: row.description ? String(row.description) : null,
    price: row.price ? String(row.price) : null,
    imageUrl: row.image_url ? String(row.image_url) : null,
    ingredients: asStrings(row.ingredients),
    flavorTags: asStrings(row.flavor_tags),
    allergens: asStrings(row.allergens),
    baseSpirit: row.base_spirit ? String(row.base_spirit) : null,
    strength: (row.strength as StoredDrink["strength"]) ?? null,
    recommendationNote: row.recommendation_note ? String(row.recommendation_note) : null,
    availabilityStatus: row.availability_status,
  };
}

function drinkWrite(input: DrinkInput) {
  return {
    name: input.name,
    description: input.description,
    price: input.price,
    image_url: input.imageUrl,
    ingredients: [...input.ingredients],
    flavor_tags: [...input.flavorTags],
    allergens: [...input.allergens],
    base_spirit: input.baseSpirit,
    strength: input.strength,
    // Unknown strength stays alcoholic so it can never satisfy a
    // non-alcoholic preference by accident.
    alcoholic: input.strength !== "zero",
    recommendation_note: input.recommendationNote,
  };
}

function firstFreeSlug(taken: ReadonlySet<string>, slugBase: string): string {
  if (!taken.has(slugBase)) return slugBase;
  for (let suffix = 2; suffix < 1_000; suffix += 1) {
    const candidate = `${slugBase}-${suffix}`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error("Slug already exists");
}

function asStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}
