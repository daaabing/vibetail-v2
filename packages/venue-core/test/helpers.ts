/**
 * Shared helpers for venue-core tests that run against the local Supabase
 * stack. Connection config comes from process.env, injected by
 * test/global-db-setup.ts (which regenerates the seed and resets the local
 * database once per vitest run).
 *
 * Data-autonomy rule: tests that WRITE must operate on accounts/venues they
 * created through these helpers (unique names per call), so the seeded
 * fixture data stays read-only and test files cannot pollute each other
 * within one database reset.
 */
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/repositories/database.types.js";
import { SupabaseManagementRepository } from "../src/repositories/supabase-management.js";
import { SupabaseVenueManagementRepository } from "../src/repositories/supabase-venue-management.js";
import { SupabaseVenueRepository } from "../src/repositories/supabase.js";

export interface SupabaseTestEnv {
  url: string;
  publishableKey: string;
  serviceRoleKey: string;
}

export function supabaseTestEnv(): SupabaseTestEnv {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !publishableKey || !serviceRoleKey) {
    throw new Error(
      [
        "SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY / SUPABASE_SERVICE_ROLE_KEY are not set.",
        "They are injected by test/global-db-setup.ts, which requires the Supabase CLI",
        "and a running Docker daemon (see the Testing section in the README).",
      ].join(" "),
    );
  }
  return { url, publishableKey, serviceRoleKey };
}

/** Public consumer reads. RLS applies: only active merchants and published menus are visible. */
export function anonVenueRepository(): SupabaseVenueRepository {
  const { url, publishableKey } = supabaseTestEnv();
  return new SupabaseVenueRepository({ url, publishableKey });
}

/** Legacy private-token management adapter (service-role key, bypasses RLS). */
export function managementRepository(): SupabaseManagementRepository {
  const { url, serviceRoleKey } = supabaseTestEnv();
  return new SupabaseManagementRepository({ url, serviceRoleKey });
}

/** Account-based venue backend adapter (service-role key, bypasses RLS). */
export function venueManagementRepository(): SupabaseVenueManagementRepository {
  const { url, serviceRoleKey } = supabaseTestEnv();
  return new SupabaseVenueManagementRepository({ url, serviceRoleKey });
}

let uniqueCounter = 0;

/**
 * Unique-per-run lowercase name that doubles as a slug base. The counter keeps
 * names readable; the random suffix keeps separate vitest module instances
 * (one per test file) from ever colliding inside the shared database.
 */
export function uniqueName(prefix: string): string {
  uniqueCounter += 1;
  return `${prefix}-${uniqueCounter}-${randomBytes(4).toString("hex")}`;
}

export interface LegacyMerchantContext {
  token: string;
  merchantId: string;
  merchantSlug: string;
}

/**
 * Creates an isolated merchant plus a legacy management token. No service or
 * repository code path mints merchant_access_tokens rows (they are provisioned
 * out of band in production), so the token row is inserted directly with the
 * service-role client; token_hash is the sha256 hex of the raw token, matching
 * SupabaseManagementRepository.verifyManagementToken.
 */
export async function createLegacyMerchantContext(prefix: string): Promise<LegacyMerchantContext> {
  const { url, serviceRoleKey } = supabaseTestEnv();
  const repository = venueManagementRepository();
  const name = uniqueName(prefix);
  const account = await repository.findOrCreateAccount(name, name);
  const merchantId = await repository.createVenue(account.id, {
    name,
    slugBase: name,
    address: "1 Test Street",
    venueType: "cocktail_bar",
  });
  const profile = await repository.getVenueProfile(merchantId);
  if (!profile) throw new Error(`No venue profile after createVenue for ${name}`);

  const token = `${name}-${randomBytes(16).toString("hex")}`;
  const client = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });
  const inserted = await client
    .from("merchant_access_tokens")
    .insert({ merchant_id: merchantId, token_hash: sha256Hex(token) });
  if (inserted.error) throw new Error(inserted.error.message);
  return { token, merchantId, merchantSlug: profile.slug };
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
