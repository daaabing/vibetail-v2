import { describe, expect, it } from "vitest";
import type { IdentityVerifier, VerifiedIdentity } from "../src/identity.js";
import { FixtureVenueRepository } from "../src/repositories/fixture.js";
import {
  DefaultVenueManagementService,
  VenueManagementServiceError,
} from "../src/venue-management-service.js";

const ALICE: VerifiedIdentity = {
  authUserId: "11111111-1111-4111-8111-111111111111",
  email: "alice@example.com",
  displayName: "Alice Chan",
};

/** Stands in for Supabase Auth: only the listed tokens are valid. */
class StubVerifier implements IdentityVerifier {
  constructor(private readonly tokens: Record<string, VerifiedIdentity>) {}

  async verify(token: string): Promise<VerifiedIdentity | null> {
    return this.tokens[token] ?? null;
  }
}

const VALID_TOKEN = "valid-token-with-enough-length";

function createService(identities: Record<string, VerifiedIdentity> = { [VALID_TOKEN]: ALICE }) {
  const repository = new FixtureVenueRepository();
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
    expect(first.account.email).toBe("alice@example.com");
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
