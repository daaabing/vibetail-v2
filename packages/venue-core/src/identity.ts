import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * A caller proven to own an external identity (Supabase Auth today).
 * `authUserId` is the stable subject; email and display name are profile hints
 * that may change between sign-ins and are refreshed on every account lookup.
 */
export interface VerifiedIdentity {
  authUserId: string;
  email: string | null;
  displayName: string;
}

/** Turns a bearer token into a verified identity, or null when it is invalid or expired. */
export interface IdentityVerifier {
  verify(token: string): Promise<VerifiedIdentity | null>;
}

// Access tokens live ~1h and the browser refreshes them, so a short cache removes
// the per-request round trip while keeping sign-out effective within a minute.
const CACHE_TTL_MS = 60_000;
const CACHE_MAX_ENTRIES = 2_000;

export interface SupabaseIdentityVerifierOptions {
  url: string;
  publishableKey: string;
  cacheTtlMs?: number;
}

export class SupabaseIdentityVerifier implements IdentityVerifier {
  private readonly client: SupabaseClient;
  private readonly cacheTtlMs: number;
  private readonly cache = new Map<string, { identity: VerifiedIdentity; expiresAt: number }>();

  constructor(options: SupabaseIdentityVerifierOptions) {
    this.client = createClient(options.url, options.publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    this.cacheTtlMs = options.cacheTtlMs ?? CACHE_TTL_MS;
  }

  async verify(token: string): Promise<VerifiedIdentity | null> {
    if (token.length < 16) return null;
    const now = Date.now();
    const cached = this.cache.get(token);
    if (cached && cached.expiresAt > now) return cached.identity;

    const { data, error } = await this.client.auth.getUser(token);
    if (error || !data.user) {
      this.cache.delete(token);
      return null;
    }
    const metadata = data.user.user_metadata ?? {};
    const email = typeof data.user.email === "string" ? data.user.email : null;
    const identity: VerifiedIdentity = {
      authUserId: data.user.id,
      email,
      displayName: pickDisplayName(metadata, email, data.user.id),
    };
    // Whole-map eviction keeps the cache bounded without tracking access order;
    // the cost is one extra round trip for callers active at the moment it trips.
    if (this.cache.size >= CACHE_MAX_ENTRIES) this.cache.clear();
    this.cache.set(token, { identity, expiresAt: now + this.cacheTtlMs });
    return identity;
  }
}

function pickDisplayName(
  metadata: Record<string, unknown>,
  email: string | null,
  authUserId: string,
): string {
  for (const key of ["full_name", "name", "preferred_username"]) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim().slice(0, 200);
  }
  const localPart = email?.split("@")[0];
  if (localPart) return localPart.slice(0, 200);
  return `user-${authUserId.slice(0, 8)}`;
}
