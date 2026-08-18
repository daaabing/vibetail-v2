// Sensory model for the mixing flow: the three-axis state, how it folds into
// the flavour list the API expects, and the copy shown while it runs.

import type { Lang } from "./i18n.js";

// ── Sensory state → concrete backend payload ─────────────────────────────
export interface SensoryState {
  fresh: number; // 0 fresh ↔ 100 rich
  soft: number; // 0 soft ↔ 100 bold
  familiar: number; // 0 familiar ↔ 100 unexpected
  strength: number; // 0 slow-sip (long) ↔ 100 hit-me (short)
}

export const DEFAULT_SENSORY: SensoryState = {
  fresh: 50,
  soft: 50,
  familiar: 50,
  strength: 50,
};

export function sensoryTouched(s: SensoryState): boolean {
  return s.fresh !== 50 || s.soft !== 50 || s.familiar !== 50 || s.strength !== 50;
}

// Map three sensory axes → 2–4 existing flavor labels (English keys, as
// stored in FLAVOR_CHIPS). Deterministic, no randomness.
export function sensoryToFlavors(s: SensoryState): string[] {
  const picks: string[] = [];
  const add = (f: string) => {
    if (!picks.includes(f)) picks.push(f);
  };

  // fresh ↔ rich
  if (s.fresh < 40) {
    add("citrusy");
    add("bubbly");
    if (s.fresh < 25) add("dry");
  } else if (s.fresh > 60) {
    add("boozy");
    add("earthy");
    if (s.fresh > 75) add("smoky");
  }

  // soft ↔ bold
  if (s.soft < 40) {
    add("creamy");
    add("floral");
  } else if (s.soft > 60) {
    add("spicy");
    if (s.soft > 75) add("bitter");
  }

  // familiar ↔ unexpected
  if (s.familiar < 40) {
    add("sweet");
    add("fruity");
  } else if (s.familiar > 60) {
    add("herbal");
    if (s.familiar > 75) add("smoky");
  }

  return picks.slice(0, 4);
}

export function strengthToDrinkLength(s: SensoryState): "" | "long" | "short" {
  if (s.strength < 35) return "long";
  if (s.strength > 65) return "short";
  return "";
}

// ── Bottle color / fill from vibe + sensory ──────────────────────────────
function hex(x: string) {
  const m = x.replace("#", "");
  return [
    parseInt(m.slice(0, 2), 16),
    parseInt(m.slice(2, 4), 16),
    parseInt(m.slice(4, 6), 16),
  ] as const;
}
function mix(a: string, b: string, t: number) {
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(bl)}`;
}

// Compute the live bottle color from the chosen vibe hue + sensory tuning.
export function computeBottleColor(base: string, s: SensoryState): string {
  // rich → deepen toward espresso; fresh → lift toward parchment cool.
  let c = base;
  if (s.fresh > 55) c = mix(c, "#3E2A1E", (s.fresh - 55) / 90);
  if (s.fresh < 45) c = mix(c, "#E9DBC4", (45 - s.fresh) / 90);
  if (s.soft > 55) c = mix(c, "#7A3427", (s.soft - 55) / 120);
  if (s.familiar > 60) c = mix(c, "#4C5C6B", (s.familiar - 60) / 140);
  return c;
}

export function computeFill(hasVibe: boolean, s: SensoryState): number {
  if (!hasVibe) return 14;
  // fill also gently reacts to strength: hit-me = higher / more concentrated.
  return Math.round(52 + (s.strength - 50) * 0.24 + (s.fresh - 50) * -0.08);
}

// ── Human-readable summary ("Feel: crisp, soft, with a twist.") ──────────
export function sensorySummary(_lang: Lang, s: SensoryState): string {
  const bits: string[] = [];
  const push = (a: string, cond: boolean) => {
    if (cond) bits.push(a);
  };

  push("crisp", s.fresh < 40);
  push("rich", s.fresh > 60);
  push("soft", s.soft < 40);
  push("with a kick", s.soft > 60);
  push("familiar", s.familiar < 40);
  push("with a twist", s.familiar > 60);

  if (bits.length === 0) return "Feel: leave it to us.";
  return `Feel: ${bits.join(", ")}.`;
}

// ── The thinking, spelled out while the model works ──────────────────────
export function loadingLines(_lang: Lang, isMenu: boolean): string[] {
  return [
    "Reading what you wrote",
    "Turning the mood into flavour",
    isMenu ? "Going through tonight's menu" : "Choosing a base and the rest",
    "Balancing it, tasting it",
    "Giving it a name",
  ];
}
