import { describe, expect, it } from "vitest";
import { venueAvatarDataUri, venueInitials } from "./venue-avatar.js";

describe("venue fallback avatar", () => {
  it("builds a monogram from the name", () => {
    expect(venueInitials("Double Chicken Please")).toBe("DC");
    expect(venueInitials("nightjar")).toBe("NI");
    // Punctuation and digits never start a monogram on their own.
    expect(venueInitials("  &  bar 77")).toBe("B7");
    expect(venueInitials("夜莺酒吧")).toBe("夜莺");
    expect(venueInitials("!!!")).toBe("•");
  });

  it("is deterministic per name and renders an inline SVG", () => {
    const first = venueAvatarDataUri("Nightjar Demo");
    expect(first).toBe(venueAvatarDataUri("Nightjar Demo"));
    expect(first.startsWith("data:image/svg+xml,")).toBe(true);
    const svg = decodeURIComponent(first.slice("data:image/svg+xml,".length));
    expect(svg).toContain("<svg");
    expect(svg).toContain(">ND<");
  });

  it("escapes a name that would otherwise break the markup", () => {
    const svg = decodeURIComponent(venueAvatarDataUri("<b>&co</b> lounge").slice("data:image/svg+xml,".length));
    // "b" and "co" are the first two words; the raw angle brackets never land in the markup.
    expect(svg).toContain(">BC<");
    expect(svg).not.toContain("<b>");
  });

  it("spreads names across the three treatments", () => {
    const fields = ["Double Chicken Please", "Nightjar Demo", "Vibetail Taproom", "Inactive Venue"]
      .map((name) => decodeURIComponent(venueAvatarDataUri(name)).match(/fill='(#[0-9a-f]{6})'/)![1]);
    expect(new Set(fields).size).toBeGreaterThan(1);
  });
});
