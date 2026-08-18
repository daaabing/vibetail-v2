import { runtimeConfigSchema, type AuthConfig } from "@vibetail/contracts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { clearVenueToken, readVenueToken } from "../venue-admin/session-store.js";

let configPromise: Promise<AuthConfig> | null = null;
let clientPromise: Promise<SupabaseClient> | null = null;

/**
 * Auth settings come from the server at runtime so one client build works in
 * local, staging, and production. A failed load is not cached: falling back
 * to the passwordless path on a transient network blip would be misleading.
 */
export function loadAuthConfig(): Promise<AuthConfig> {
  configPromise ??= fetch("/v1/config")
    .then((response) => {
      if (!response.ok) throw new Error(`config request failed with ${response.status}`);
      return response.json();
    })
    .then((body: unknown) => runtimeConfigSchema.parse(body).auth)
    .catch((error: unknown) => {
      configPromise = null;
      throw error;
    });
  return configPromise;
}

/** Resolves null when this deployment has no identity provider configured. */
async function getSupabaseClient(): Promise<SupabaseClient | null> {
  const config = await loadAuthConfig();
  if (config.provider !== "supabase") return null;
  const { supabaseUrl, supabasePublishableKey } = config;
  if (!supabaseUrl || !supabasePublishableKey) return null;
  // Loaded on demand so anonymous guests never download the auth SDK.
  clientPromise ??= import("@supabase/supabase-js").then(({ createClient }) =>
    createClient(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // The callback route exchanges the code explicitly; see completeOAuthRedirect.
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    }));
  return clientPromise;
}

/**
 * The bearer token for API calls. Supabase refreshes an expiring access token
 * here, so callers should fetch it per request rather than hold onto it.
 */
export async function getAccessToken(): Promise<string | null> {
  const client = await getSupabaseClient();
  if (!client) return readVenueToken();
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}

/** Every sign-in path needs a configured client; fail with one shared message. */
async function requireClient(): Promise<SupabaseClient> {
  const client = await getSupabaseClient();
  if (!client) throw new Error("Sign-in is not configured on this deployment.");
  return client;
}

/**
 * Email/password sign-in. Needs no external OAuth client, so it is the path
 * that works against a bare local Supabase stack and in tests.
 */
export async function signInWithEmail(email: string, password: string): Promise<void> {
  const client = await requireClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

/**
 * Registers a new email account. Returns false when the project has email
 * confirmation switched on and no session was issued — the caller must then
 * tell the user to click the link rather than pretend they are signed in.
 */
export async function signUpWithEmail(email: string, password: string): Promise<boolean> {
  const client = await requireClient();
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  return Boolean(data.session);
}

export async function signInWithGoogle(next: string): Promise<void> {
  const client = await requireClient();
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}`;
  const { error } = await client.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  const client = await getSupabaseClient();
  clearVenueToken();
  if (client) await client.auth.signOut();
}

/**
 * Finishes the PKCE redirect and returns the in-app path to continue to.
 * Throws with the provider's message when the user denied consent.
 */
export async function completeOAuthRedirect(search: string): Promise<string> {
  const params = new URLSearchParams(search);
  const providerError = params.get("error_description") ?? params.get("error");
  if (providerError) throw new Error(providerError);
  const code = params.get("code");
  if (!code) throw new Error("This sign-in link is incomplete. Start again from the sign-in page.");
  const client = await requireClient();
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) throw new Error(error.message);
  return safeNext(params.get("next") ?? "/");
}

/** Blocks open redirects: only same-origin, single-slash paths are honoured. */
export function safeNext(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
