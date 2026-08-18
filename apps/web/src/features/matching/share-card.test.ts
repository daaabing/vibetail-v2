import { describe, expect, it } from "vitest";
import { wrapText } from "./share-card.js";

// 10px per character, so maxWidth translates directly into characters per line.
const measure = { measureText: (text: string) => ({ width: text.length * 10 }) as TextMetrics };

describe("wrapText", () => {
  it("wraps latin text on word boundaries", () => {
    expect(wrapText(measure, "a quiet drink for a loud day", 100)).toEqual([
      "a quiet",
      "drink for",
      "a loud day",
    ]);
  });

  it("wraps spaceless CJK text character by character", () => {
    expect(wrapText(measure, "漫长的一天想喝点明亮的", 50)).toEqual([
      "漫长的一天",
      "想喝点明亮",
      "的",
    ]);
  });

  it("splits a single overlong spaceless token instead of overflowing the canvas", () => {
    expect(wrapText(measure, "supercalifragilistic", 50)).toEqual([
      "super", "calif", "ragil", "istic",
    ]);
  });

  it("keeps a mid-sentence overlong word on its own line rather than dropping it", () => {
    expect(wrapText(measure, "an extraordinarily bright pour", 110)).toEqual([
      "an",
      "extraordinarily",
      "bright pour",
    ]);
  });
});

