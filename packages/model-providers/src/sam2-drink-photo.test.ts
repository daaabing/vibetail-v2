import { describe, expect, it } from "vitest";
import { buildSam2CocktailPrompt } from "./sam2-drink-photo.js";

describe("sam2 drink photo", () => {
  it("builds a cocktail-tailored SAM 2 auto prompt", () => {
    const prompt = buildSam2CocktailPrompt("Don't Sweat The Technique", "Tequila and raspberry.");
    expect(prompt.strategy).toBe("cocktail_auto");
    expect(prompt.fillHoles).toBe(true);
    expect(prompt.instructions).toContain("Segment ONLY the cocktail glass");
    expect(prompt.instructions).toContain("fill holes");
    expect(prompt.instructions).not.toMatch(/Reconstruct|Source notes/i);
  });
});
