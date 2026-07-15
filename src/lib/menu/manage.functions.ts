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
        "id, slug, name, status, short_intro, enabled_game_ids, game_display_order, published_version_id, updated_at",
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
        "id, name, ingredients, alcoholic, base_spirit, section, availability_status, recommendation_priority, sort_order, image_url",
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
