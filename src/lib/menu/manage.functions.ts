// Merchant management server functions. Access is gated by a private token
// (stored as SHA-256 hash in merchant_access_tokens). Every write validates
// the token and derives merchant_id server-side.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { hashToken, safeEqualHex } from "./tokens";

async function verifyAndGetMerchantId(token: string): Promise<string> {
  if (!token || token.length < 16) throw new Error("Invalid token");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const digest = await hashToken(token);
  const { data, error } = await supabaseAdmin
    .from("merchant_access_tokens")
    .select("merchant_id, token_hash, revoked_at")
    .is("revoked_at", null);
  if (error) throw new Error(error.message);
  const match = (data ?? []).find((row) => safeEqualHex(row.token_hash, digest));
  if (!match) throw new Error("Unauthorized");
  return match.merchant_id;
}

const TokenInput = z.object({ token: z.string().min(16) });

/** Verify token; return merchant + all their menus (draft & published). */
export const getMerchantForToken = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => TokenInput.parse(input))
  .handler(async ({ data }) => {
    const merchantId = await verifyAndGetMerchantId(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: merchant, error: mErr } = await supabaseAdmin
      .from("merchants")
      .select("id, slug, name, logo_url, cover_image_url, short_intro, is_active")
      .eq("id", merchantId)
      .single();
    if (mErr) throw new Error(mErr.message);

    const { data: menus, error: menusErr } = await supabaseAdmin
      .from("menus")
      .select(
        "id, slug, name, status, short_intro, enabled_game_ids, game_display_order, published_version_id, updated_at, menu_file_url, menu_file_type",
      )
      .eq("merchant_id", merchantId)
      .order("updated_at", { ascending: false });
    if (menusErr) throw new Error(menusErr.message);

    return { merchant, menus: menus ?? [] };
  });

const MenuItemsInput = TokenInput.extend({ menuId: z.string().uuid() });

export const getMenuItemsForManage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => MenuItemsInput.parse(input))
  .handler(async ({ data }) => {
    const merchantId = await verifyAndGetMerchantId(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Confirm this menu belongs to this merchant.
    const { data: menu, error: menuErr } = await supabaseAdmin
      .from("menus")
      .select("id, merchant_id, name, slug, status")
      .eq("id", data.menuId)
      .single();
    if (menuErr) throw new Error(menuErr.message);
    if (menu.merchant_id !== merchantId) throw new Error("Forbidden");

    const { data: items, error: itemsErr } = await supabaseAdmin
      .from("menu_items")
      .select(
        "id, name, ingredients, alcoholic, base_spirit, section, availability_status, recommendation_priority, sort_order, image_url, flavor_tags, mood_tags, description",
      )
      .eq("menu_id", data.menuId)
      .order("sort_order", { ascending: true });
    if (itemsErr) throw new Error(itemsErr.message);
    return { menu, items: items ?? [] };
  });

const AvailabilityInput = TokenInput.extend({
  menuItemId: z.string().uuid(),
  availabilityStatus: z.enum(["active", "sold_out", "hidden"]),
});

/** Sold-out toggle takes effect immediately, no republish needed. */
export const setItemAvailability = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => AvailabilityInput.parse(input))
  .handler(async ({ data }) => {
    const merchantId = await verifyAndGetMerchantId(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Ownership check
    const { data: row, error: rowErr } = await supabaseAdmin
      .from("menu_items")
      .select("id, menu_id, menus:menu_id(merchant_id)")
      .eq("id", data.menuItemId)
      .single();
    if (rowErr) throw new Error(rowErr.message);
    const owner = (row.menus as unknown as { merchant_id: string } | null)?.merchant_id;
    if (owner !== merchantId) throw new Error("Forbidden");

    const { error } = await supabaseAdmin
      .from("menu_items")
      .update({ availability_status: data.availabilityStatus })
      .eq("id", data.menuItemId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const PublishInput = TokenInput.extend({ menuId: z.string().uuid() });

/** Publish creates an immutable snapshot and marks the menu published. */
export const publishMenu = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PublishInput.parse(input))
  .handler(async ({ data }) => {
    const merchantId = await verifyAndGetMerchantId(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: menu, error: mErr } = await supabaseAdmin
      .from("menus")
      .select("id, merchant_id, enabled_game_ids")
      .eq("id", data.menuId)
      .single();
    if (mErr) throw new Error(mErr.message);
    if (menu.merchant_id !== merchantId) throw new Error("Forbidden");
    if (!menu.enabled_game_ids || menu.enabled_game_ids.length === 0) {
      throw new Error("Enable at least one game before publishing.");
    }

    const { data: items, error: iErr } = await supabaseAdmin
      .from("menu_items")
      .select("*")
      .eq("menu_id", data.menuId)
      .eq("availability_status", "active");
    if (iErr) throw new Error(iErr.message);
    if (!items || items.length === 0) {
      throw new Error("Add at least one active drink before publishing.");
    }

    const { data: maxRow } = await supabaseAdmin
      .from("menu_versions")
      .select("version_number")
      .eq("menu_id", data.menuId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = (maxRow?.version_number ?? 0) + 1;

    const { data: fullMenu } = await supabaseAdmin
      .from("menus")
      .select("*")
      .eq("id", data.menuId)
      .single();

    const { data: version, error: vErr } = await supabaseAdmin
      .from("menu_versions")
      .insert({
        menu_id: data.menuId,
        version_number: nextVersion,
        snapshot: { menu: fullMenu, items },
      })
      .select("id, version_number")
      .single();
    if (vErr) throw new Error(vErr.message);

    const { error: upErr } = await supabaseAdmin
      .from("menus")
      .update({ status: "published", published_version_id: version.id })
      .eq("id", data.menuId);
    if (upErr) throw new Error(upErr.message);
    return { ok: true, versionId: version.id, versionNumber: version.version_number };
  });

const StatusInput = TokenInput.extend({
  menuId: z.string().uuid(),
  status: z.enum(["draft", "published", "paused"]),
});

export const setMenuStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => StatusInput.parse(input))
  .handler(async ({ data }) => {
    const merchantId = await verifyAndGetMerchantId(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: menu, error: mErr } = await supabaseAdmin
      .from("menus")
      .select("id, merchant_id, published_version_id")
      .eq("id", data.menuId)
      .single();
    if (mErr) throw new Error(mErr.message);
    if (menu.merchant_id !== merchantId) throw new Error("Forbidden");
    if (data.status === "published" && !menu.published_version_id) {
      throw new Error("Publish once first to create an initial version.");
    }
    const { error } = await supabaseAdmin
      .from("menus")
      .update({ status: data.status })
      .eq("id", data.menuId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Create menu ----------

const CreateMenuInput = TokenInput.extend({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "slug must be lowercase, hyphen-separated"),
  shortIntro: z.string().max(280).optional().nullable(),
  enabledGameIds: z.array(z.string().min(1)).min(1),
});

export const createMenu = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CreateMenuInput.parse(input))
  .handler(async ({ data }) => {
    const merchantId = await verifyAndGetMerchantId(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("menus")
      .insert({
        merchant_id: merchantId,
        name: data.name,
        slug: data.slug,
        short_intro: data.shortIntro ?? null,
        enabled_game_ids: data.enabledGameIds,
        game_display_order: data.enabledGameIds,
        status: "draft",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, menuId: row.id };
  });

// ---------- Menu item CRUD ----------

const ItemCoreInput = z.object({
  name: z.string().min(1).max(200),
  section: z.string().max(120).optional().nullable(),
  ingredients: z.array(z.string().min(1)).default([]),
  baseSpirit: z.string().max(120).optional().nullable(),
  alcoholic: z.boolean().default(true),
  description: z.string().max(1000).optional().nullable(),
  imageUrl: z.string().url().optional().nullable().or(z.literal("")),
  flavorTags: z.array(z.string().min(1)).default([]),
  moodTags: z.array(z.string().min(1)).default([]),
  sortOrder: z.number().int().optional(),
});

const CreateItemInput = TokenInput.extend({ menuId: z.string().uuid() }).merge(ItemCoreInput);

export const createMenuItem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => CreateItemInput.parse(input))
  .handler(async ({ data }) => {
    const merchantId = await verifyAndGetMerchantId(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: menu, error: mErr } = await supabaseAdmin
      .from("menus")
      .select("id, merchant_id")
      .eq("id", data.menuId)
      .single();
    if (mErr) throw new Error(mErr.message);
    if (menu.merchant_id !== merchantId) throw new Error("Forbidden");

    const { data: maxRow } = await supabaseAdmin
      .from("menu_items")
      .select("sort_order")
      .eq("menu_id", data.menuId)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextSort = data.sortOrder ?? (maxRow?.sort_order ?? 0) + 10;

    const { data: row, error } = await supabaseAdmin
      .from("menu_items")
      .insert({
        menu_id: data.menuId,
        name: data.name,
        section: data.section ?? null,
        ingredients: data.ingredients,
        base_spirit: data.baseSpirit ?? null,
        alcoholic: data.alcoholic,
        description: data.description ?? "",
        image_url: data.imageUrl ? data.imageUrl : null,
        flavor_tags: data.flavorTags,
        mood_tags: data.moodTags,
        sort_order: nextSort,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, itemId: row.id };
  });

const UpdateItemInput = TokenInput.extend({ menuItemId: z.string().uuid() }).merge(ItemCoreInput);

export const updateMenuItem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => UpdateItemInput.parse(input))
  .handler(async ({ data }) => {
    const merchantId = await verifyAndGetMerchantId(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error: rowErr } = await supabaseAdmin
      .from("menu_items")
      .select("id, menus:menu_id(merchant_id)")
      .eq("id", data.menuItemId)
      .single();
    if (rowErr) throw new Error(rowErr.message);
    const owner = (row.menus as unknown as { merchant_id: string } | null)?.merchant_id;
    if (owner !== merchantId) throw new Error("Forbidden");

    const { error } = await supabaseAdmin
      .from("menu_items")
      .update({
        name: data.name,
        section: data.section ?? null,
        ingredients: data.ingredients,
        base_spirit: data.baseSpirit ?? null,
        alcoholic: data.alcoholic,
        description: data.description ?? "",
        image_url: data.imageUrl ? data.imageUrl : null,
        flavor_tags: data.flavorTags,
        mood_tags: data.moodTags,
      })
      .eq("id", data.menuItemId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const DeleteItemInput = TokenInput.extend({ menuItemId: z.string().uuid() });

export const deleteMenuItem = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => DeleteItemInput.parse(input))
  .handler(async ({ data }) => {
    const merchantId = await verifyAndGetMerchantId(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error: rowErr } = await supabaseAdmin
      .from("menu_items")
      .select("id, menus:menu_id(merchant_id)")
      .eq("id", data.menuItemId)
      .single();
    if (rowErr) throw new Error(rowErr.message);
    const owner = (row.menus as unknown as { merchant_id: string } | null)?.merchant_id;
    if (owner !== merchantId) throw new Error("Forbidden");
    const { error } = await supabaseAdmin
      .from("menu_items")
      .delete()
      .eq("id", data.menuItemId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Full menu file (image or PDF) ----------

const UploadMenuFileInput = TokenInput.extend({
  menuId: z.string().uuid(),
  filename: z.string().min(1).max(200),
  contentType: z.string().min(3).max(120),
  // base64-encoded file bytes (no data: prefix).
  dataBase64: z.string().min(4).max(20_000_000), // ~15 MB decoded upper bound
});

export const uploadMenuFile = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => UploadMenuFileInput.parse(input))
  .handler(async ({ data }) => {
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
    if (!allowed.includes(data.contentType)) {
      throw new Error("Only PDF, PNG, JPG, or WEBP menus are supported.");
    }
    const merchantId = await verifyAndGetMerchantId(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: menu, error: mErr } = await supabaseAdmin
      .from("menus")
      .select("id, merchant_id")
      .eq("id", data.menuId)
      .single();
    if (mErr) throw new Error(mErr.message);
    if (menu.merchant_id !== merchantId) throw new Error("Forbidden");

    const bytes = Uint8Array.from(atob(data.dataBase64), (c) => c.charCodeAt(0));
    if (bytes.byteLength > 15 * 1024 * 1024) {
      throw new Error("File is larger than 15 MB.");
    }
    const safeName = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
    const path = `${merchantId}/${data.menuId}/${Date.now()}-${safeName}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("merchant-menus")
      .upload(path, bytes, { contentType: data.contentType, upsert: false });
    if (upErr) throw new Error(upErr.message);

    // Private bucket — create a very long-lived signed URL (10 years).
    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("merchant-menus")
      .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
    if (signErr || !signed) throw new Error(signErr?.message ?? "Failed to sign URL");

    const fileType = data.contentType === "application/pdf" ? "pdf" : "image";
    const { error: updErr } = await supabaseAdmin
      .from("menus")
      .update({ menu_file_url: signed.signedUrl, menu_file_type: fileType })
      .eq("id", data.menuId);
    if (updErr) throw new Error(updErr.message);

    return { ok: true, url: signed.signedUrl, fileType };
  });

const ClearMenuFileInput = TokenInput.extend({ menuId: z.string().uuid() });

export const clearMenuFile = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ClearMenuFileInput.parse(input))
  .handler(async ({ data }) => {
    const merchantId = await verifyAndGetMerchantId(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: menu, error: mErr } = await supabaseAdmin
      .from("menus")
      .select("id, merchant_id")
      .eq("id", data.menuId)
      .single();
    if (mErr) throw new Error(mErr.message);
    if (menu.merchant_id !== merchantId) throw new Error("Forbidden");
    const { error } = await supabaseAdmin
      .from("menus")
      .update({ menu_file_url: null, menu_file_type: null })
      .eq("id", data.menuId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

