import { describe, expect, it } from "vitest";
import { safeNext } from "./auth-session.js";

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
