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
  clientPromise ??= import("@supabase/supabase-js")
    .then(({ createClient }) =>
      createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // The callback route exchanges the code explicitly; see completeOAuthRedirect.
          detectSessionInUrl: false,
          flowType: "pkce",
        },
      }))
    .catch((error: unknown) => {
      // Like configPromise above: a failed chunk load must not be cached, or
      // every later sign-in attempt replays the same rejection until a reload.
      clientPromise = null;
      throw error;
    });
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

export type SignUpOutcome = "signed_in" | "confirm_email" | "already_registered";

/**
 * Registers a new email account. `confirm_email` means the project has email
 * confirmation on and a link is on its way; `already_registered` is Supabase's
 * anti-enumeration reply for an existing confirmed address (an obfuscated user
 * with no identities and no session — and no email coming), which the caller
 * must not present as "check your inbox".
 */
export async function signUpWithEmail(email: string, password: string): Promise<SignUpOutcome> {
  const client = await requireClient();
  const { data, error } = await client.auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  if (data.session) return "signed_in";
  if (data.user && (data.user.identities?.length ?? 0) === 0) return "already_registered";
  return "confirm_email";
}

export async function signInWithGoogle(next: string): Promise<void> {
  const client = await requireClient();
  const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext(next))}`;
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw new Error(error.message);
  if (!data.url) throw new Error("Google sign-in could not be started.");
  // The button renders regardless of deployment readiness, so probe GoTrue
  // before leaving the page: an enabled provider answers with a redirect
  // (opaque under CORS, status 0), a missing OAuth client answers 4xx JSON.
  // Probe failures (network, CORS) fall through to the normal redirect.
  try {
    const probe = await fetch(data.url, { redirect: "manual" });
    if (probe.status >= 400) {
      throw new GoogleNotConfiguredError();
    }
  } catch (caught) {
    if (caught instanceof GoogleNotConfiguredError) {
      throw new Error(
        "Google sign-in is not set up on this deployment yet. Use email and password, or ask the operator to finish the Google configuration.",
      );
    }
  }
  window.location.assign(data.url);
}

class GoogleNotConfiguredError extends Error {}

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

/** Blocks open redirects: only same-origin paths are honoured. */
export function safeNext(next: string): string {
  if (!next.startsWith("/")) return "/";
  // Delegate to the URL parser so every browser normalization — tab/CR/LF
  // stripping, backslash folding — happens BEFORE the origin check. A regex
  // cannot keep up with those rules; "/\t/evil.example" defeats a lookahead.
  try {
    const resolved = new URL(next, "http://internal");
    if (resolved.origin !== "http://internal") return "/";
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return "/";
  }
}
