// Generates infra/supabase/seed.sql from fixtures/venue/menus.json.
//
// Deterministic: the same fixture JSON always produces byte-identical SQL
// (no Date.now, no randomness). Event timestamps are emitted as relative
// `now() - interval 'N minutes'` expressions so dashboards stay populated
// no matter when the seed runs.
//
// Column mapping authority: the Supabase adapters in
// packages/venue-core/src/repositories/ (supabase.ts, supabase-venue-management.ts)
// and database.types.ts (DB column names / nullability), backed by the
// migrations in infra/supabase/migrations/.

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..");
const fixturePath = join(repoRoot, "fixtures", "venue", "menus.json");
const outputPath = join(repoRoot, "infra", "supabase", "seed.sql");

const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
const venues = fixture.venues ?? {};
const accounts = venues.accounts ?? [];
const profiles = venues.profiles ?? [];
const drinks = venues.drinks ?? [];
const menuDrinks = venues.menuDrinks ?? [];
const matchEvents = venues.matchEvents ?? [];
const menuViews = venues.menuViews ?? [];
const feedback = venues.feedback ?? [];

// ---------------------------------------------------------------------------
// SQL literal helpers
// ---------------------------------------------------------------------------

function sqlString(value) {
  if (value === null || value === undefined) return "null";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlBool(value) {
  return value ? "true" : "false";
}

function sqlInt(value) {
  if (!Number.isInteger(value)) throw new Error(`Expected integer, got: ${value}`);
  return String(value);
}

function sqlTextArray(values) {
  if (!Array.isArray(values)) throw new Error(`Expected array, got: ${values}`);
  if (values.length === 0) return "'{}'::text[]";
  return `array[${values.map(sqlString).join(", ")}]::text[]`;
}

function sqlJsonb(value) {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

// Relative event timestamps: fixtures store minutesAgo, never absolute times.
function sqlMinutesAgo(minutes) {
  return `now() - interval '${sqlInt(minutes)} minutes'`;
}

function sha256Hex(token) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** entries: array of [column, sqlLiteral] pairs (order preserved). */
function insertRow(table, entries) {
  const columns = entries.map(([column]) => column).join(", ");
  const values = entries.map(([, value]) => value).join(", ");
  return `insert into ${table} (${columns}) values (${values});`;
}

// ---------------------------------------------------------------------------
// Fixture lookups
// ---------------------------------------------------------------------------

const profileByMerchant = new Map(profiles.map((profile) => [profile.merchantId, profile]));
const drinkById = new Map(drinks.map((entry) => [entry.drink.id, entry]));
const menuIdsWithDrinkRefs = new Set(menuDrinks.map((ref) => ref.menuId));
const matchEventById = new Map(matchEvents.map((event) => [event.id, event]));

// Drinks derive `alcoholic` from strength: only 'zero' is non-alcoholic
// (mirrors drinkWrite in supabase-venue-management.ts).
function drinkAlcoholic(drink) {
  return drink.strength !== "zero";
}

function drinkSnapshotRow(merchantId, drink) {
  return {
    id: drink.id,
    merchant_id: merchantId,
    name: drink.name,
    description: drink.description,
    price: drink.price,
    image_url: drink.imageUrl,
    ingredients: drink.ingredients,
    flavor_tags: drink.flavorTags,
    allergens: drink.allergens,
    base_spirit: drink.baseSpirit,
    strength: drink.strength,
    alcoholic: drinkAlcoholic(drink),
    recommendation_note: drink.recommendationNote,
    availability_status: drink.availabilityStatus ?? "active",
  };
}

function itemSnapshotRow(menuId, item) {
  return {
    id: item.id,
    menu_id: menuId,
    name: item.name,
    description: item.description ?? "",
    image_url: item.imageUrl,
    alcoholic: item.alcoholic,
    base_spirit: item.baseSpirit,
    flavor_tags: item.flavorTags,
    mood_tags: item.moodTags,
    ingredients: item.ingredients,
    allergens: item.allergens,
    recommendation_priority: item.recommendationPriority,
    availability_status: item.availabilityStatus,
    section: item.section,
    sort_order: item.sortOrder,
  };
}

// Pre-publish menus row as it appears inside menu_versions.snapshot
// (publishMenu/publishVenueMenu select the row before flipping it to
// published, so the snapshot keeps status 'draft' and a null version id).
// created_at/updated_at are omitted: they are unknowable at seed-generation
// time and nothing reads snapshot payloads today.
function menuSnapshotRow(merchantId, menu) {
  return {
    id: menu.id,
    merchant_id: merchantId,
    slug: menu.slug,
    name: menu.name,
    status: "draft",
    published_version_id: null,
    short_intro: menu.shortIntro,
    cover_image_url: menu.coverImageUrl,
    menu_file_url: menu.fullMenuUrl,
    menu_file_type: menu.fullMenuType,
    menu_theme: null,
    enabled_game_ids: ["mood-match"],
    game_display_order: ["mood-match"],
  };
}

// ---------------------------------------------------------------------------
// Statement builders
// ---------------------------------------------------------------------------

const counts = new Map();
const lines = [];

function emit(line) {
  lines.push(line);
}

function emitInsert(table, entries) {
  counts.set(table, (counts.get(table) ?? 0) + 1);
  emit(insertRow(table, entries));
}

function emitSection(title) {
  emit("");
  emit(`-- ${"-".repeat(75)}`);
  emit(`-- ${title}`);
  emit(`-- ${"-".repeat(75)}`);
  emit("");
}

emit("-- 生成物，勿手改，由 scripts/generate-seed.mjs 生成");
emit("-- (Generated file, do not edit by hand; run `node scripts/generate-seed.mjs`.)");
emit(`-- Source fixture: fixtures/venue/menus.json`);

// --- storage bucket ---------------------------------------------------------
emitSection("Storage: private bucket for merchant menu uploads");
// 0000_baseline.sql already creates this bucket (idempotently); keep the seed
// self-sufficient but conflict-safe so db reset never fails on the duplicate.
counts.set("storage.buckets", (counts.get("storage.buckets") ?? 0) + 1);
emit(
  "insert into storage.buckets (id, name, public) values ('merchant-menus', 'merchant-menus', false) on conflict (id) do nothing;",
);

// --- merchants --------------------------------------------------------------
emitSection("Merchants (address/venue_type merged from venues.profiles)");
for (const merchant of fixture.merchants) {
  const profile = profileByMerchant.get(merchant.id);
  emitInsert("public.merchants", [
    ["id", sqlString(merchant.id)],
    ["slug", sqlString(merchant.slug)],
    ["name", sqlString(merchant.name)],
    ["short_intro", sqlString(merchant.shortIntro)],
    ["logo_url", sqlString(merchant.logoUrl)],
    ["cover_image_url", sqlString(merchant.coverImageUrl)],
    ["is_active", sqlBool(merchant.isActive)],
    ["address", sqlString(profile?.address ?? null)],
    ["venue_type", sqlString(profile?.venueType ?? null)],
  ]);
}

// --- merchant access tokens -------------------------------------------------
emitSection("Legacy management tokens (token_hash = sha256 hex of the raw token)");
for (const entry of fixture.managementTokens ?? []) {
  emitInsert("public.merchant_access_tokens", [
    ["merchant_id", sqlString(entry.merchantId)],
    ["token_hash", sqlString(sha256Hex(entry.token))],
  ]);
}

// --- auth users -------------------------------------------------------------
// Accounts carrying an `authUser` get a real GoTrue row so email/password
// sign-in works against a freshly reset local stack with no external provider.
// Must precede venue_accounts: venue_accounts.auth_user_id has an FK to auth.users.
// pgcrypto lives in the `extensions` schema on Supabase, hence the qualified calls.
emitSection("Auth users for seeded email/password sign-in (local stack only)");
for (const account of accounts) {
  const authUser = account.authUser;
  if (!authUser) continue;
  emitInsert("auth.users", [
    ["instance_id", sqlString("00000000-0000-0000-0000-000000000000")],
    ["id", sqlString(authUser.id)],
    ["aud", sqlString("authenticated")],
    ["role", sqlString("authenticated")],
    ["email", sqlString(authUser.email)],
    ["encrypted_password", `extensions.crypt(${sqlString(authUser.password)}, extensions.gen_salt('bf'))`],
    ["email_confirmed_at", "now()"],
    ["raw_app_meta_data", sqlJsonb({ provider: "email", providers: ["email"] })],
    ["raw_user_meta_data", sqlJsonb({ full_name: account.displayName })],
    ["created_at", "now()"],
    ["updated_at", "now()"],
    // GoTrue treats these as empty strings, not nulls, on a confirmed user.
    ["confirmation_token", sqlString("")],
    ["recovery_token", sqlString("")],
    ["email_change_token_new", sqlString("")],
    ["email_change", sqlString("")],
  ]);
  // Password logins still resolve through an identity row.
  emitInsert("auth.identities", [
    ["id", "gen_random_uuid()"],
    ["user_id", sqlString(authUser.id)],
    ["provider_id", sqlString(authUser.id)],
    ["provider", sqlString("email")],
    ["identity_data", sqlJsonb({
      sub: authUser.id,
      email: authUser.email,
      email_verified: true,
      phone_verified: false,
    })],
    ["last_sign_in_at", "now()"],
    ["created_at", "now()"],
    ["updated_at", "now()"],
  ]);
}

// --- venue accounts ---------------------------------------------------------
emitSection("Venue accounts (name login; auth_user_id set when seeded with an identity)");
for (const account of accounts) {
  // An account with an authUser is reachable both ways: by name under
  // AUTH_PROVIDER=none, and by email/password under AUTH_PROVIDER=supabase.
  emitInsert("public.venue_accounts", [
    ["id", sqlString(account.id)],
    ["name_normalized", sqlString(account.nameNormalized)],
    ["display_name", sqlString(account.displayName)],
    ["merchant_id", sqlString(account.merchantId)],
    ["auth_user_id", sqlString(account.authUser?.id ?? null)],
    ["email", sqlString(account.authUser?.email ?? null)],
  ]);
}

// --- drinks -----------------------------------------------------------------
emitSection("Drink library (alcoholic derived: strength !== 'zero')");
// listDrinks orders by created_at asc; stagger created_at (invented values,
// not in the fixture) so fixture array order survives the round-trip.
const drinkOffsets = new Map(drinks.map((entry, index) => [entry.drink.id, drinks.length - index]));
for (const entry of drinks) {
  const drink = entry.drink;
  emitInsert("public.drinks", [
    ["id", sqlString(drink.id)],
    ["merchant_id", sqlString(entry.merchantId)],
    ["name", sqlString(drink.name)],
    ["description", sqlString(drink.description)],
    ["price", sqlString(drink.price)],
    ["image_url", sqlString(drink.imageUrl)],
    ["ingredients", sqlTextArray(drink.ingredients)],
    ["flavor_tags", sqlTextArray(drink.flavorTags)],
    ["allergens", sqlTextArray(drink.allergens)],
    ["base_spirit", sqlString(drink.baseSpirit)],
    ["strength", sqlString(drink.strength)],
    ["alcoholic", sqlBool(drinkAlcoholic(drink))],
    ["recommendation_note", sqlString(drink.recommendationNote)],
    ["availability_status", sqlString(drink.availabilityStatus ?? "active")],
    ["created_at", sqlMinutesAgo(drinkOffsets.get(drink.id))],
  ]);
}

// --- menus (all statuses inserted as draft-or-fixture-status first) ---------
// Published menus start as 'draft' with published_version_id null; the
// publish section below runs the three-step flip once versions exist
// (menus.published_version_id <-> menu_versions.menu_id is an FK cycle).
//
// enabled_game_ids/game_display_order are NOT NULL without defaults; the
// value ['mood-match'] is invented here, mirroring createMenu defaults in
// supabase-management.ts / supabase-venue-management.ts.
//
// created_at/updated_at stagger (invented, not in the fixture): management
// lists order menus by updated_at desc, and fixture array order is
// newest-first, so menu index i gets now() - (i + 1) minutes.
function emitMenu(merchant, menu, indexWithinMerchant) {
  emitInsert("public.menus", [
    ["id", sqlString(menu.id)],
    ["merchant_id", sqlString(merchant.id)],
    ["slug", sqlString(menu.slug)],
    ["name", sqlString(menu.name)],
    ["status", sqlString(menu.publishedVersionId ? "draft" : menu.status)],
    ["published_version_id", "null"],
    ["short_intro", sqlString(menu.shortIntro)],
    ["cover_image_url", sqlString(menu.coverImageUrl)],
    ["menu_file_url", sqlString(menu.fullMenuUrl)],
    ["menu_file_type", sqlString(menu.fullMenuType)],
    ["enabled_game_ids", sqlTextArray(["mood-match"])],
    ["game_display_order", sqlTextArray(["mood-match"])],
    ["created_at", sqlMinutesAgo(indexWithinMerchant + 1)],
    ["updated_at", sqlMinutesAgo(indexWithinMerchant + 1)],
  ]);
}

emitSection("Legacy menus + menu_items (menu_items has no price column: fixture prices dropped)");
for (const merchant of fixture.merchants) {
  merchant.menus.forEach((menu, index) => {
    if (menuIdsWithDrinkRefs.has(menu.id)) return; // venue-mode, next section
    emitMenu(merchant, menu, index);
    for (const item of menu.items) {
      emitInsert("public.menu_items", [
        ["id", sqlString(item.id)],
        ["menu_id", sqlString(menu.id)],
        ["name", sqlString(item.name)],
        // menu_items.description is NOT NULL default ''.
        ["description", sqlString(item.description ?? "")],
        ["image_url", sqlString(item.imageUrl)],
        ["alcoholic", sqlBool(item.alcoholic)],
        ["base_spirit", sqlString(item.baseSpirit)],
        ["flavor_tags", sqlTextArray(item.flavorTags)],
        ["mood_tags", sqlTextArray(item.moodTags)],
        ["ingredients", sqlTextArray(item.ingredients)],
        ["allergens", sqlTextArray(item.allergens)],
        ["recommendation_priority", sqlInt(item.recommendationPriority)],
        ["availability_status", sqlString(item.availabilityStatus)],
        ["section", sqlString(item.section)],
        ["sort_order", sqlInt(item.sortOrder)],
      ]);
    }
  });
}

emitSection("Venue-mode menus + menu_drinks (items derived from the drink library)");
for (const merchant of fixture.merchants) {
  merchant.menus.forEach((menu, index) => {
    if (!menuIdsWithDrinkRefs.has(menu.id)) return;
    emitMenu(merchant, menu, index);
  });
}
for (const ref of menuDrinks) {
  if (!drinkById.has(ref.drinkId)) {
    throw new Error(`menuDrinks references unknown drink: ${ref.drinkId}`);
  }
  emitInsert("public.menu_drinks", [
    ["menu_id", sqlString(ref.menuId)],
    ["drink_id", sqlString(ref.drinkId)],
    ["sort_order", sqlInt(ref.sortOrder)],
  ]);
}

// --- publish: menu_versions + status flip -----------------------------------
emitSection("Publish: insert menu_versions then flip menus (FK cycle needs two steps)");
for (const merchant of fixture.merchants) {
  for (const menu of merchant.menus) {
    if (!menu.publishedVersionId) continue;

    // Snapshot mirrors publishMenu ({menu, items}) for legacy menus and
    // publishVenueMenu ({menu, drinks}) for drink-backed menus; both keep
    // only availability_status='active' entries, like the live code paths.
    let snapshot;
    if (menuIdsWithDrinkRefs.has(menu.id)) {
      const activeDrinks = menuDrinks
        .filter((ref) => ref.menuId === menu.id)
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((ref) => drinkById.get(ref.drinkId))
        .filter((entry) => (entry.drink.availabilityStatus ?? "active") === "active")
        .map((entry) => drinkSnapshotRow(entry.merchantId, entry.drink));
      snapshot = { menu: menuSnapshotRow(merchant.id, menu), drinks: activeDrinks };
    } else {
      const activeItems = menu.items
        .filter((item) => item.availabilityStatus === "active")
        .map((item) => itemSnapshotRow(menu.id, item));
      snapshot = { menu: menuSnapshotRow(merchant.id, menu), items: activeItems };
    }

    emitInsert("public.menu_versions", [
      ["id", sqlString(menu.publishedVersionId)],
      ["menu_id", sqlString(menu.id)],
      ["version_number", "1"],
      ["snapshot", sqlJsonb(snapshot)],
    ]);
    counts.set("update public.menus (publish)", (counts.get("update public.menus (publish)") ?? 0) + 1);
    emit(
      `update public.menus set status = 'published', published_version_id = ${sqlString(menu.publishedVersionId)} where id = ${sqlString(menu.id)};`,
    );
  }
}

// --- match events -----------------------------------------------------------
emitSection("Match events (fixture UUIDs; created_at relative to now())");
// account_id (in database.types.ts) is not written: the local migrations do
// not have the column yet and fixture events are all anonymous (null).
for (const event of matchEvents) {
  emitInsert("public.match_events", [
    ["id", sqlString(event.id)],
    ["merchant_id", sqlString(event.merchantId)],
    ["menu_id", sqlString(event.menuId)],
    ["item_id", sqlString(event.itemId)],
    ["item_name", sqlString(event.itemName)],
    ["trace_id", sqlString(event.traceId)],
    ["created_at", sqlMinutesAgo(event.minutesAgo)],
  ]);
}

// --- match feedback ---------------------------------------------------------
emitSection("Match feedback (merchant_id resolved via matchId -> matchEvents)");
for (const entry of feedback) {
  const match = matchEventById.get(entry.matchId);
  if (!match) throw new Error(`feedback references unknown match event: ${entry.matchId}`);
  // account_id omitted for the same reason as match_events above.
  emitInsert("public.match_feedback", [
    ["id", sqlString(entry.id)],
    ["match_id", sqlString(entry.matchId)],
    ["merchant_id", sqlString(match.merchantId)],
    ["rating", sqlInt(entry.rating)],
    ["comment", sqlString(entry.comment)],
    ["created_at", sqlMinutesAgo(entry.minutesAgo)],
  ]);
}

// --- menu views -------------------------------------------------------------
emitSection("Menu views (id is generated always identity: never inserted)");
for (const view of menuViews) {
  emitInsert("public.menu_views", [
    ["merchant_id", sqlString(view.merchantId)],
    ["menu_id", sqlString(view.menuId)],
    ["created_at", sqlMinutesAgo(view.minutesAgo)],
  ]);
}

emit("");

// ---------------------------------------------------------------------------
// Write output
// ---------------------------------------------------------------------------

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, lines.join("\n"), "utf8");

console.log(`Wrote ${outputPath} (${lines.length} lines)`);
for (const [table, count] of counts) {
  console.log(`  ${table}: ${count}`);
}
