import { AnimatePresence, motion } from "framer-motion";

import { ROUGH } from "./Sketch";
import Draw from "./art";
import type { MixOrder } from "@/lib/mix-flow";
import { BASE_SPIRITS } from "@/lib/mix-flow";
import { strengthToDrinkLength } from "@/lib/vibeflow";

/**
 * The pour, live. A charcoal drawing of tonight's drink that assembles
 * itself while the guest answers: liquid rises with the strength, ice
 * arrives when the night is long, garnish follows the palate, and the
 * chosen bottle tips in from the side. White line on black — the same
 * contrast the hero runs on.
 */

// Rocks glass interior, in viewBox units (0 0 240 300).
const GLASS_TOP = 74;
const GLASS_BOTTOM = 254;
const INNER_H = GLASS_BOTTOM - GLASS_TOP;
const GLASS_OUTER = "M62 66 H178 L167 250 a9 9 0 0 1 -9 8 H82 a9 9 0 0 1 -9 -8 Z";

const FILL_BY_ALCOHOL: Record<string, number> = {
  zero: 0.34,
  low: 0.44,
  standard: 0.62,
  strong: 0.86,
};

/* ── The one place colour lives in the app: inside the glass. ─────────
   The drink glows like a mood-lab specimen — a duotone that follows the
   palate: bright pours run aqua at the surface, deep pours run midnight
   blue; the base warms from pale gold to burnt amber as the drink bites
   harder. A chosen spirit takes over the base with its own colour. The
   light bleeds softly onto the black wall behind. */

function lerpHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const k = Math.max(0, Math.min(1, t));
  return (
    "#" +
    pa
      .map((v, i) =>
        Math.round(v + (pb[i] - v) * k)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

export default function DrinkStage({
  order,
  hasVibe,
  step,
}: {
  order: MixOrder;
  hasVibe: boolean;
  step: number;
}) {
  const fill = hasVibe ? FILL_BY_ALCOHOL[order.alcohol] ?? 0.62 : 0;
  const liquidTop = GLASS_BOTTOM - INNER_H * fill;

  const bright = order.sensory.fresh < 42;
  const punchy = order.sensory.soft > 58;
  const surprising = order.sensory.familiar > 58;
  const length = strengthToDrinkLength(order.sensory);
  const iced = length === "long";
  const spirit = BASE_SPIRITS.find((s) => s.key === order.baseSpirit);

  // The mood's colour, mixed live: surface follows crisp↔rich, base
  // follows gentle↔punchy — unless a spirit brings its own colour.
  const topColor = lerpHex("#8fd8cf", "#3d5e8f", order.sensory.fresh / 100);
  const baseColor = spirit?.color ?? lerpHex("#e0b76a", "#c05a2e", order.sensory.soft / 100);

  const parts: string[] = [];
  if (order.moodText.trim() || order.pickedLabel) parts.push("the mood");
  if (bright) parts.push("something bright");
  if (order.sensory.fresh > 58) parts.push("something deep");
  if (punchy) parts.push("a jolt");
  if (iced) parts.push("ice");
  if (spirit) parts.push(spirit.en.toLowerCase());
  if (order.manualFlavors.length) parts.push(order.manualFlavors.join(" · ").toLowerCase());

  return (
    <div className="relative flex h-full flex-col" style={{ background: "var(--paper)" }}>
      <div className="grain-layer" aria-hidden style={{ opacity: 0.4 }} />

      {/* ── Plate header ── */}
      <div className="relative flex items-baseline justify-between px-8 pt-7 lg:px-10">
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: 15,
            letterSpacing: "0.3em",
            color: "var(--ink)",
          }}
        >
          VIBETAL(E.)
        </span>
        <span className="mono-sm">{"The pour — live"}</span>
      </div>

      {/* ── The drink ── */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center">
        {/* The pour's light, bleeding onto the wall */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[62%] -translate-x-1/2 -translate-y-1/2"
          initial={false}
          animate={{ opacity: hasVibe ? 1 : 0 }}
          transition={{ duration: 1.2 }}
          style={{
            background: `radial-gradient(45% 38% at 50% 30%, ${topColor}2e, transparent 70%), radial-gradient(50% 42% at 50% 72%, ${baseColor}3a, transparent 72%)`,
            filter: "blur(18px)",
            transition: "background 900ms ease",
          }}
        />

        <div className="stage-orbit w-[min(64%,340px)]">
          <svg viewBox="0 0 240 300" style={{ overflow: "visible", color: "var(--ink)" }}>
            <defs>
              <clipPath id="stage-glass-clip">
                <path d={GLASS_OUTER} />
              </clipPath>
              <linearGradient id="stage-liquid-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={topColor} stopOpacity="0.9">
                  <animate
                    attributeName="stop-opacity"
                    values="0.9;0.75;0.9"
                    dur="4s"
                    repeatCount="indefinite"
                  />
                </stop>
                <stop offset="100%" stopColor={baseColor} stopOpacity="0.95" />
              </linearGradient>
            </defs>

            {/* Liquid — the mood, in colour */}
            <g clipPath="url(#stage-glass-clip)">
              <motion.rect
                x="56"
                width="130"
                fill="url(#stage-liquid-grad)"
                initial={false}
                animate={{
                  y: liquidTop,
                  height: Math.max(0, GLASS_BOTTOM + 10 - liquidTop),
                  opacity: hasVibe ? 0.9 : 0,
                }}
                transition={{ type: "spring", stiffness: 130, damping: 20 }}
                style={{ mixBlendMode: "screen" }}
              />
              {/* Surface line */}
              {hasVibe && (
                <motion.path
                  d="M52 0 C 90 -7, 150 7, 190 -2"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  fill="none"
                  strokeLinecap="round"
                  filter={ROUGH}
                  initial={false}
                  animate={{ y: liquidTop }}
                  transition={{ type: "spring", stiffness: 130, damping: 20 }}
                />
              )}

              {/* Ice — two rough cubes for a long night */}
              <AnimatePresence>
                {iced && hasVibe && (
                  <motion.g
                    key="ice"
                    filter={ROUGH}
                    stroke="currentColor"
                    strokeWidth="2.2"
                    fill="none"
                    initial={{ opacity: 0, y: -40 }}
                    animate={{ opacity: 0.9, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 160, damping: 14 }}
                  >
                    <path
                      d={`M86 ${liquidTop + 16} l30 -8 8 26 -30 9 Z`}
                    />
                    <path
                      d={`M132 ${liquidTop + 34} l26 -6 6 24 -26 7 Z`}
                    />
                  </motion.g>
                )}
              </AnimatePresence>

              {/* Bubbles — always breathing, denser when the pour is bright */}
              {hasVibe && (
                <g stroke="currentColor" fill="none" strokeWidth="1.8" opacity="0.7">
                  {(bright ? [96, 112, 126, 140, 154] : [110, 132, 150]).map((cx, i) => (
                    <circle key={cx} cx={cx} cy={0} r={2.6 + (i % 3)}>
                      <animate
                        attributeName="cy"
                        from={String(GLASS_BOTTOM - 6)}
                        to={String(liquidTop + 10)}
                        dur={`${2.2 + i * 0.6}s`}
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0;0.7;0"
                        dur={`${2.2 + i * 0.6}s`}
                        repeatCount="indefinite"
                      />
                    </circle>
                  ))}
                </g>
              )}
            </g>

            {/* Glass */}
            <g
              filter={ROUGH}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={GLASS_OUTER} />
              <path d="M62 66 H178" strokeWidth="3.6" />
            </g>

            {/* Citrus wheel on the rim when bright */}
            <AnimatePresence>
              {bright && hasVibe && (
                <motion.g
                  key="citrus"
                  filter={ROUGH}
                  stroke="currentColor"
                  fill="none"
                  strokeWidth="2.2"
                  initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  style={{ transformOrigin: "178px 62px" }}
                >
                  <circle cx="181" cy="56" r="20" />
                  <path d="M181 36 v40 M161 56 h40 M167 42 l28 28 M195 42 l-28 28" strokeWidth="1.5" />
                </motion.g>
              )}
            </AnimatePresence>

            {/* A chili beside the foot when the pour bites back */}
            <AnimatePresence>
              {punchy && hasVibe && (
                <motion.g
                  key="chili"
                  filter={ROUGH}
                  stroke="currentColor"
                  fill="none"
                  strokeWidth="2.2"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <path d="M196 262 c14 4 26 0 30 -10 c-8 12 -20 12 -30 10 Z" />
                  <path d="M224 250 q6 -6 2 -12" strokeWidth="1.8" />
                </motion.g>
              )}
            </AnimatePresence>

            {/* Swizzle for the unexpected */}
            <AnimatePresence>
              {surprising && hasVibe && (
                <motion.g
                  key="swizzle"
                  filter={ROUGH}
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  initial={{ opacity: 0, rotate: -14 }}
                  animate={{ opacity: 0.95, rotate: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ transformOrigin: "108px 160px" }}
                >
                  <path d="M96 30 L128 208" />
                  <circle cx="93" cy="24" r="8" fill="none" />
                </motion.g>
              )}
            </AnimatePresence>
          </svg>
        </div>

        {/* The chosen bottle tips in from the corner */}
        <AnimatePresence>
          {spirit && (
            <motion.div
              key={spirit.key}
              className="absolute left-[12%] top-[12%] w-[17%]"
              style={{ color: "var(--ink)", transformOrigin: "bottom right" }}
              initial={{ opacity: 0, rotate: 0, y: 14 }}
              animate={{ opacity: 0.95, rotate: 24, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ type: "spring", stiffness: 120, damping: 16 }}
            >
              <Draw name={spirit.key} strokeWidth={2.6} />
              <div className="mono-sm mt-3 text-center" style={{ letterSpacing: "0.22em" }}>
                {spirit.en}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step numeral, etched on the wall */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-[-0.16em] right-[-0.03em] select-none"
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            fontSize: "min(30vh, 16vw)",
            lineHeight: 1,
            color: "var(--ink)",
            opacity: 0.06,
          }}
        >
          {String(step + 1).padStart(2, "0")}
        </div>
      </div>

      {/* ── Status ledger ── */}
      <div className="relative px-8 pb-8 lg:px-10">
        <hr className="rule-strong" style={{ background: "var(--line-strong)" }} />
        <div className="mt-4 flex items-baseline justify-between gap-6">
          <div className="min-w-0">
            <div className="mono-sm mb-1.5 flex items-center gap-2.5">
              {"In the glass so far"}
              {hasVibe && (
                <span className="flex items-center gap-1.5" aria-hidden>
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: topColor, transition: "background 700ms ease" }}
                  />
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: baseColor, transition: "background 700ms ease" }}
                  />
                </span>
              )}
            </div>
            <p
              className="accent-italic truncate text-[19px] leading-snug"
              style={{ color: "var(--ink-soft)" }}
            >
              {parts.length ? parts.join(", ") : "nothing yet — tell us the mood"}
            </p>
          </div>
          <span className="mono-sm shrink-0" style={{ color: "var(--ink-mute)" }}>
            {"it builds as you answer"}
          </span>
        </div>
      </div>
    </div>
  );
}
