import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { beforeAll, describe, expect, it } from "vitest";
import { SupabaseIdentityVerifier, type IdentityVerifier, type VerifiedIdentity } from "../src/identity.js";
import {
  DefaultVenueManagementService,
  VenueManagementServiceError,
} from "../src/venue-management-service.js";
import { supabaseTestEnv, uniqueName, venueManagementRepository } from "./helpers.js";

// Unique per vitest module instance: the email doubles as name_normalized in
// venue_accounts, so it must never collide with seed data or other test files
// sharing the local database (see the data-autonomy rule in helpers.ts).
const ALICE_EMAIL = `${uniqueName("idauth-alice")}@example.com`;
const ALICE: VerifiedIdentity = {
  // Filled in beforeAll: venue_accounts.auth_user_id has a foreign key to
  // auth.users, so the identity must belong to a real GoTrue user — exactly as
  // in production, where Supabase Auth creates the user before our verifier
  // ever sees the token.
  authUserId: "",
  email: ALICE_EMAIL,
  displayName: "Alice Chan",
};

// BOB exercises the 23505 fallback: a legacy passwordless account already owns
// name_normalized === his email, so his identity account must retreat to the
// auth user id as its name. CAROL exercises the concurrent-first-login race.
const BOB_EMAIL = `${uniqueName("idauth-bob")}@example.com`;
const BOB: VerifiedIdentity = { authUserId: "", email: BOB_EMAIL, displayName: "Bob Lin" };
const CAROL_EMAIL = `${uniqueName("idauth-carol")}@example.com`;
const CAROL: VerifiedIdentity = { authUserId: "", email: CAROL_EMAIL, displayName: "Carol Wu" };

let admin: SupabaseClient;

beforeAll(async () => {
  const { url, serviceRoleKey } = supabaseTestEnv();
  admin = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  for (const identity of [ALICE, BOB, CAROL]) {
    if (!identity.email) throw new Error("test identity requires an email");
    const created = await admin.auth.admin.createUser({
      email: identity.email,
      email_confirm: true,
    });
    if (created.error) throw new Error(`Failed to create auth user: ${created.error.message}`);
    identity.authUserId = created.data.user.id;
  }
});

/** Stands in for Supabase Auth: only the listed tokens are valid. */
class StubVerifier implements IdentityVerifier {
  constructor(private readonly tokens: Record<string, VerifiedIdentity>) {}

  async verify(token: string): Promise<VerifiedIdentity | null> {
    return this.tokens[token] ?? null;
  }
}

// Mirrors fixtures/venue/menus.json → venues.accounts[0].authUser. The seed
// generator turns that block into the auth.users row these credentials unlock.
const SEEDED_DEMO_EMAIL = "demo@vibetail.test";
const SEEDED_DEMO_PASSWORD = "vibetail-demo";

const VALID_TOKEN = "valid-token-with-enough-length";

function createService(identities: Record<string, VerifiedIdentity> = { [VALID_TOKEN]: ALICE }) {
  const repository = venueManagementRepository();
  const service = new DefaultVenueManagementService(repository, {
    appUrl: "http://127.0.0.1:3000",
    identityVerifier: new StubVerifier(identities),
    renderQrSvg: async (text) => `<svg data-url="${text}"></svg>`,
  });
  return { repository, service };
}

describe("identity-backed venue sessions", () => {
  it("creates one account on first sign-in and reuses it afterwards", async () => {
    const { service } = createService();
    const first = await service.getSession(VALID_TOKEN);
    const second = await service.getSession(VALID_TOKEN);
    expect(first.account.id).toBe(second.account.id);
    expect(first.account.displayName).toBe("Alice Chan");
    expect(first.account.email).toBe(ALICE_EMAIL);
    // A brand-new identity owns no venue until it completes setup.
    expect(first.venue).toBeNull();
  });

  it("rejects unknown tokens", async () => {
    const { service } = createService();
    await expect(service.getSession("some-other-long-token")).rejects.toMatchObject({
      httpStatus: 401,
    });
  });

  it("refuses the passwordless name login when an identity provider is configured", async () => {
    const { service } = createService();
    await expect(service.login("Demo Bar")).rejects.toBeInstanceOf(VenueManagementServiceError);
    await expect(service.login("Demo Bar")).rejects.toMatchObject({ httpStatus: 400 });
  });

  it("keeps the same account across the guest and venue surfaces", async () => {
    const { service } = createService();
    const session = await service.getSession(VALID_TOKEN);
    expect(await service.resolveAccountId(VALID_TOKEN)).toBe(session.account.id);
  });

  it("treats anonymous and invalid guest tokens as signed out rather than failing", async () => {
    const { service } = createService();
    expect(await service.resolveAccountId("")).toBeNull();
    expect(await service.resolveAccountId("not-a-real-token-at-all")).toBeNull();
  });

  it("does not touch server session rows on sign-out", async () => {
    const { repository, service } = createService();
    let revoked = false;
    repository.revokeVenueSession = async () => {
      revoked = true;
    };
    await service.logout(VALID_TOKEN);
    expect(revoked).toBe(false);
  });
});

describe("findOrCreateAccountByIdentity conflict fallback (23505)", () => {
  const BOB_TOKEN = "bob-token-with-enough-length";
  const CAROL_TOKEN = "carol-token-with-enough-length";

  it("falls back to the auth user id when a legacy account already owns the email name", async () => {
    const { repository, service } = createService({ [BOB_TOKEN]: BOB });
    // A pre-existing passwordless account whose name_normalized is exactly
    // Bob's e-mail: the identity insert hits 23505, the auth_user_id re-read
    // finds nothing, and the deterministic fallback retries with the auth id.
    const legacy = await repository.findOrCreateAccount(BOB_EMAIL.toLowerCase(), "Legacy Bob");
    expect(legacy.authUserId).toBeNull();

    const session = await service.getSession(BOB_TOKEN);
    expect(session.account.id).not.toBe(legacy.id);
    expect(session.account.email).toBe(BOB_EMAIL);

    const rows = await admin
      .from("venue_accounts")
      .select("id, name_normalized, auth_user_id")
      .in("id", [legacy.id, session.account.id]);
    expect(rows.error).toBeNull();
    const byId = new Map((rows.data ?? []).map((row) => [row.id, row]));
    // The legacy row is not absorbed: same name, still unclaimed.
    expect(byId.get(legacy.id)).toMatchObject({
      name_normalized: BOB_EMAIL.toLowerCase(),
      auth_user_id: null,
    });
    // The identity row retreated to the auth user id as its name.
    expect(byId.get(session.account.id)).toMatchObject({
      name_normalized: BOB.authUserId,
      auth_user_id: BOB.authUserId,
    });
  });

  it("collapses a concurrent first sign-in into a single account", async () => {
    // Two service instances ≈ two server processes handling the same first
    // login at once. Timing-dependent by nature: both requests usually pass
    // the initial auth_user_id lookup before either insert commits, driving
    // the loser through the 23505 re-read branch — but whichever interleaving
    // occurs, the observable contract is one shared account, exactly one row.
    const left = createService({ [CAROL_TOKEN]: CAROL }).service;
    const right = createService({ [CAROL_TOKEN]: CAROL }).service;

    const [first, second] = await Promise.all([
      left.getSession(CAROL_TOKEN),
      right.getSession(CAROL_TOKEN),
    ]);
    expect(first.account.id).toBe(second.account.id);

    const rows = await admin
      .from("venue_accounts")
      .select("id")
      .eq("auth_user_id", CAROL.authUserId);
    expect(rows.error).toBeNull();
    expect(rows.data).toHaveLength(1);
  });
});

// Everything above stubs the verifier. This block exercises the real one:
// a genuine GoTrue access token verified through SupabaseIdentityVerifier's
// auth.getUser call — the only path production actually takes.
describe("SupabaseIdentityVerifier against real access tokens", () => {
  const PASSWORD = "vibetail-test-password";

  async function realTokenFor(email: string): Promise<string> {
    const { url, publishableKey } = supabaseTestEnv();
    const anon = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await anon.auth.signInWithPassword({ email, password: PASSWORD });
    if (error || !data.session) throw new Error(`Sign-in failed: ${error?.message ?? "no session"}`);
    return data.session.access_token;
  }

  function realService() {
    const { url, publishableKey } = supabaseTestEnv();
    return new DefaultVenueManagementService(venueManagementRepository(), {
      appUrl: "http://127.0.0.1:3000",
      identityVerifier: new SupabaseIdentityVerifier({ url, publishableKey }),
      renderQrSvg: async (text) => `<svg data-url="${text}"></svg>`,
    });
  }

  it("resolves an account from an email/password access token", async () => {
    const email = `${uniqueName("idauth-real")}@example.com`;
    const created = await admin.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Real Token User" },
    });
    if (created.error) throw new Error(created.error.message);

    const session = await realService().getSession(await realTokenFor(email));
    expect(session.account.email).toBe(email);
    expect(session.account.displayName).toBe("Real Token User");
  });

  it("rejects a syntactically valid but unissued token", async () => {
    await expect(realService().getSession(`${"a".repeat(40)}.${"b".repeat(40)}.${"c".repeat(40)}`))
      .rejects.toMatchObject({ httpStatus: 401 });
  });

  it("signs the seeded demo account in by email onto its existing venue", async () => {
    // Guards the seed contract: the demo row is reachable by name login AND by
    // email, and both resolve to the same account with its venue attached.
    const session = await realService().getSession(await seededDemoToken());
    expect(session.account.displayName).toBe("Demo Bar");
    expect(session.account.email).toBe(SEEDED_DEMO_EMAIL);
    expect(session.venue?.slug).toBe("vibetail-taproom");

    const byName = await venueManagementRepository().findOrCreateAccount("demo bar", "Demo Bar");
    expect(byName.id).toBe(session.account.id);
  });

  async function seededDemoToken(): Promise<string> {
    const { url, publishableKey } = supabaseTestEnv();
    const anon = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await anon.auth.signInWithPassword({
      email: SEEDED_DEMO_EMAIL,
      password: SEEDED_DEMO_PASSWORD,
    });
    if (error || !data.session) throw new Error(`Seeded demo sign-in failed: ${error?.message}`);
    return data.session.access_token;
  }
});
