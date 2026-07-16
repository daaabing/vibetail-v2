// ── Two-act "Vibe → Sensory" flow: constants, mapping to the existing
// backend payload, and small helpers. Everything else (API contract, result
// card, menu match) stays unchanged.

import type { Lang } from "@/lib/i18n";

export type VibeKey =
  | "flirty"
  | "party"
  | "meltdown"
  | "explorer"
  | "vibesOnly"
  | "clarity"
  | "surprise";

export interface QuickVibe {
  key: VibeKey;
  labelZh: string;
  labelEn: string;
  color: string;           // pill accent + first fill color
  moodZh: string;          // what we send to backend as `mood`
  moodEn: string;
  replyZh: string;         // local response line (no AI call)
  replyEn: string;
}

// 7 curated vibes — first-screen focus, no long list.
export const QUICK_VIBES: QuickVibe[] = [
  {
    key: "flirty",
    labelZh: "暧昧局",
    labelEn: "Flirty",
    color: "#DAC5C3",
    moodZh: "有点暧昧的夜，想要一杯让人多看你一眼的酒",
    moodEn: "a flirty evening, want something that makes people glance twice",
    replyZh: "懂了，今晚有点危险。",
    replyEn: "Got it. Tonight's a little dangerous.",
  },
  {
    key: "party",
    labelZh: "拼酒局",
    labelEn: "Party night",
    color: "#B7A9B3",
    moodZh: "拼酒局，需要一杯上头但不难喝的",
    moodEn: "party night — need something that hits without wrecking me",
    replyZh: "收到，这局你得撑住。",
    replyEn: "Copy that. You're staying upright.",
  },
  {
    key: "meltdown",
    labelZh: "成年人的崩溃",
    labelEn: "Adult meltdown",
    color: "#99B9C6",
    moodZh: "今天有点崩溃，想找一杯能安静喝的酒",
    moodEn: "quietly falling apart, want a drink that lets me sit with it",
    replyZh: "懂了，今天有点悬。",
    replyEn: "I hear you. Rough day.",
  },
  {
    key: "explorer",
    labelZh: "出来见世面",
    labelEn: "Out exploring",
    color: "#A9B4A1",
    moodZh: "出来见见世面，想试点没喝过的",
    moodEn: "out to see the world, want to try something new",
    replyZh: "很好，胃口打开了。",
    replyEn: "Nice. Palate's open tonight.",
  },
  {
    key: "vibesOnly",
    labelZh: "今天全靠氛围感",
    labelEn: "Pure vibes",
    color: "#D8D3C9",
    moodZh: "今天什么都不想想，全靠氛围感",
    moodEn: "not thinking tonight — pure vibes only",
    replyZh: "收到，情绪路面湿滑。",
    replyEn: "Roads are wet. Drive by feel.",
  },
  {
    key: "clarity",
    labelZh: "人间清醒",
    labelEn: "Stone-cold clear",
    color: "#BFBEBD",
    moodZh: "人间清醒，只是嘴巴想喝点什么",
    moodEn: "clear-headed, just want something in the glass",
    replyZh: "OK，来一杯克制的。",
    replyEn: "OK. Something restrained then.",
  },
  {
    key: "surprise",
    labelZh: "随机来一个",
    labelEn: "Surprise me",
    color: "#C08457",
    moodZh: "随便调，看着办",
    moodEn: "surprise me — you pick",
    replyZh: "行，今晚我做主。",
    replyEn: "Fine. I'm in the driver's seat.",
  },
];

export function getVibe(key: VibeKey | null): QuickVibe | null {
  if (!key) return null;
  return QUICK_VIBES.find((v) => v.key === key) ?? null;
}

// ── Sensory state → concrete backend payload ─────────────────────────────
export interface SensoryState {
  fresh: number;      // 0 fresh ↔ 100 rich
  soft: number;       // 0 soft ↔ 100 bold
  familiar: number;   // 0 familiar ↔ 100 unexpected
  strength: number;   // 0 slow-sip (long) ↔ 100 hit-me (short)
}

export const DEFAULT_SENSORY: SensoryState = {
  fresh: 50,
  soft: 50,
  familiar: 50,
  strength: 50,
};

export function sensoryTouched(s: SensoryState): boolean {
  return (
    s.fresh !== 50 || s.soft !== 50 || s.familiar !== 50 || s.strength !== 50
  );
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
export function computeBottleColor(
  base: string,
  s: SensoryState,
): string {
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

// ── Human-readable summary ("现在的感觉：清爽、柔和，带一点意外。")──
export function sensorySummary(lang: Lang, s: SensoryState): string {
  const bits: string[] = [];
  const zh = lang === "zh";

  const push = (a: string, cond: boolean) => {
    if (cond) bits.push(a);
  };

  push(zh ? "清爽" : "crisp", s.fresh < 40);
  push(zh ? "浓郁" : "rich", s.fresh > 60);
  push(zh ? "柔和" : "soft", s.soft < 40);
  push(zh ? "带点刺激" : "with a kick", s.soft > 60);
  push(zh ? "熟悉" : "familiar", s.familiar < 40);
  push(zh ? "带一点意外" : "with a twist", s.familiar > 60);

  if (bits.length === 0) return zh ? "现在的感觉：交给你了。" : "Feel: leave it to us.";
  return zh
    ? `现在的感觉：${bits.join("、")}。`
    : `Feel: ${bits.join(", ")}.`;
}

// ── Loading rotation lines ──
export function loadingLines(lang: Lang, isMenu: boolean): string[] {
  if (lang === "zh") {
    const base = [
      "正在读懂你的状态…",
      "正在挑选合适的风味…",
      "正在把崩溃调得顺口一点…",
    ];
    return isMenu ? [...base, "正在匹配今晚的菜单…"] : base;
  }
  const base = [
    "Reading your state…",
    "Picking the right flavor…",
    "Making the meltdown drinkable…",
  ];
  return isMenu ? [...base, "Matching tonight's menu…"] : base;
}
