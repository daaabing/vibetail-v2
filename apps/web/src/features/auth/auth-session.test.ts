import { describe, expect, it } from "vitest";
import { accountInitial, buildOAuthRedirectUrl, hasStoredSession, safeNext } from "./auth-session.js";

describe("safeNext", () => {
  it("keeps plain same-origin paths", () => {
    expect(safeNext("/venue/dashboard")).toBe("/venue/dashboard");
    expect(safeNext("/m/some-bar?table=2")).toBe("/m/some-bar?table=2");
  });

  it("rejects every off-origin escape", () => {
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("//evil.example")).toBe("/");
    // Browsers treat backslashes as slashes when resolving URLs.
    expect(safeNext("/\\evil.example")).toBe("/");
    // Browsers strip ASCII tab/LF/CR from URLs before resolving, turning
    // "/<tab>/evil.example" into scheme-relative "//evil.example".
    expect(safeNext("/\t/evil.example")).toBe("/");
    expect(safeNext("/\n/evil.example")).toBe("/");
    expect(safeNext("/\r\\evil.example")).toBe("/");
    expect(safeNext("")).toBe("/");
    expect(safeNext("venue/dashboard")).toBe("/");
  });
});

/** Enough of Storage for the key scan; the real one is unavailable under node. */
function storage(...keys: string[]): Pick<Storage, "key" | "length"> {
  return { length: keys.length, key: (index: number) => keys[index] ?? null };
}

describe("hasStoredSession", () => {
  it("recognises the supabase session key, chunked or not", () => {
    expect(hasStoredSession(storage("sb-abcdefg-auth-token"))).toBe(true);
    expect(hasStoredSession(storage("theme", "sb-abcdefg-auth-token.0", "sb-abcdefg-auth-token.1"))).toBe(true);
  });

  it("stays false for an empty or unrelated store", () => {
    expect(hasStoredSession(storage())).toBe(false);
    expect(hasStoredSession(storage("theme", "vibetail:match-handoff:v1", "sb-auth-token"))).toBe(false);
  });

  it("treats unreadable storage as signed out", () => {
    const blocked: Pick<Storage, "key" | "length"> = {
      get length(): number { throw new Error("blocked"); },
      key: () => null,
    };
    expect(hasStoredSession(blocked)).toBe(false);
  });
});

describe("accountInitial", () => {
  const base = { id: "user-1", email: null, avatarUrl: null };

  it("takes the first letter of the display name", () => {
    expect(accountInitial({ ...base, displayName: "ada lovelace" })).toBe("A");
    expect(accountInitial({ ...base, displayName: "陈" })).toBe("陈");
  });

  it("skips leading punctuation and falls back to the email", () => {
    expect(accountInitial({ ...base, displayName: "@nightowl" })).toBe("N");
    expect(accountInitial({ ...base, displayName: "   ", email: "guest@example.com" })).toBe("G");
  });

  it("never renders empty", () => {
    expect(accountInitial({ ...base, displayName: "…" })).toBe("?");
  });
});

describe("buildOAuthRedirectUrl", () => {
  it.each(["https://app.example.com", "https://preview.example.net"])(
    "anchors the Google callback to the configured APP_URL origin: %s",
    (configuredAppUrl) => {
      expect(buildOAuthRedirectUrl({ appUrl: configuredAppUrl }, "/venue/dashboard")).toBe(
        `${configuredAppUrl}/auth/callback?next=%2Fvenue%2Fdashboard`,
      );
    },
  );

  it("normalizes the post-login path before attaching it", () => {
    expect(buildOAuthRedirectUrl({ appUrl: "https://app.example.com" }, "https://evil.example")).toBe(
      "https://app.example.com/auth/callback?next=%2F",
    );
  });
});
