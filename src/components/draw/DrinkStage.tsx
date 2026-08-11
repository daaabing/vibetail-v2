import { AnimatePresence, motion } from "framer-motion";

import { ROUGH } from "./Sketch";
import type { MixOrder } from "@/lib/mix-flow";
import { BASE_SPIRITS } from "@/lib/mix-flow";
import { strengthToDrinkLength } from "@/lib/vibeflow";
import { findVibePick } from "@/lib/vibe-picks";

/**
 * The pour, live. A charcoal drawing of tonight's drink that assembles
 * itself while the guest answers. The vessel itself follows the strength —
 * a stemmed coupe for zero-proof, a rocks glass for a light pour, the tall
 * glass for standard, and the whole bottle when it's strong. Ice arrives
 * when the night is long, flames when it's one-and-done, and every flavour
 * note hangs its own garnish on the glass. White line on black — the same
 * contrast the hero runs on.
 */

/* ── Vessels, in shared viewBox units (0 0 240 300) ─────────────────── */

interface Vessel {
  name: string;
  /** Stroked outline paths (drawn with the rough filter). */
  outline: string[];
  /** Closed interior path used to clip the liquid. */
  clip: string;
  /** Liquid rect bounds. */
  x: number;
  w: number;
  top: number;
  bottom: number;
  /** How full this vessel pours. */
  fill: number;
  /** Rim anchor for garnish (right end + height) and centreline. */
  rimY: number;
  rimRight: number;
  cx: number;
}

const VESSELS: Record<string, Vessel> = {
  // 高脚杯 — a shallow coupe on a tall stem, for the zero-proof ritual.
  coupe: {
    name: "coupe",
    outline: [
      "M46 72 C 50 106, 88 124, 120 124 C 152 124, 190 106, 194 72",
      "M46 72 H194",
      "M120 124 V250",
      "M78 254 C 92 240, 148 240, 162 254",
      "M78 254 H162",
    ],
    clip: "M46 72 H194 C 190 106, 152 124, 120 124 C 88 124, 50 106, 46 72 Z",
    x: 42,
    w: 156,
    top: 76,
    bottom: 122,
    fill: 0.8,
    rimY: 72,
    rimRight: 194,
    cx: 120,
  },
  // An old-fashioned rocks glass for a light pour.
  rocks: {
    name: "rocks",
    outline: ["M64 128 H176 L170 246 a9 9 0 0 1 -9 8 H80 a9 9 0 0 1 -9 -8 Z", "M64 128 H176"],
    clip: "M64 128 H176 L170 246 a9 9 0 0 1 -9 8 H80 a9 9 0 0 1 -9 -8 Z",
    x: 58,
    w: 128,
    top: 132,
    bottom: 250,
    fill: 0.66,
    rimY: 128,
    rimRight: 176,
    cx: 120,
  },
  // The house tall glass for a standard pour.
  tall: {
    name: "tall",
    outline: ["M62 66 H178 L167 250 a9 9 0 0 1 -9 8 H82 a9 9 0 0 1 -9 -8 Z", "M62 66 H178"],
    clip: "M62 66 H178 L167 250 a9 9 0 0 1 -9 8 H82 a9 9 0 0 1 -9 -8 Z",
    x: 56,
    w: 130,
    top: 74,
    bottom: 254,
    fill: 0.62,
    rimY: 66,
    rimRight: 178,
    cx: 120,
  },
  // Strong: skip the glass, take the bottle.
  bottle: {
    name: "bottle",
    outline: [
      "M106 26 h28 v30 c 0 12, 18 18, 18 34 l0 148 a10 10 0 0 1 -10 10 h-44 a10 10 0 0 1 -10 -10 l0 -148 c 0 -16, 18 -22, 18 -34 Z",
      "M106 40 h28",
    ],
    clip: "M106 26 h28 v30 c 0 12, 18 18, 18 34 l0 148 a10 10 0 0 1 -10 10 h-44 a10 10 0 0 1 -10 -10 l0 -148 c 0 -16, 18 -22, 18 -34 Z",
    x: 84,
    w: 72,
    top: 94,
    bottom: 244,
    fill: 0.8,
    rimY: 26,
    rimRight: 134,
    cx: 120,
  },
};

const VESSEL_BY_ALCOHOL: Record<string, Vessel> = {
  zero: VESSELS.coupe,
  low: VESSELS.rocks,
  standard: VESSELS.tall,
  strong: VESSELS.bottle,
};

/* ── Colour ─────────────────────────────────────────────────────────── */

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

/* ── Flavour garnish — every note hangs something on the glass ──────── */

function FlavorDecor({
  label,
  vessel,
  liquidTop,
  index,
}: {
  label: string;
  vessel: Vessel;
  liquidTop: number;
  index: number;
}) {
  const { rimY, rimRight, cx } = vessel;
  const rimLeft = 240 - rimRight;
  const common = {
    filter: ROUGH,
    stroke: "currentColor",
    fill: "none" as const,
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const entry = {
    initial: { opacity: 0, scale: 0.6 },
    animate: { opacity: 0.95, scale: 1 },
    exit: { opacity: 0, scale: 0.6 },
    transition: { type: "spring" as const, stiffness: 200, damping: 16, delay: index * 0.05 },
  };

  switch (label) {
    case "spicy":
      // a proper chili, resting by the foot
      return (
        <motion.g {...common} {...entry} style={{ transformOrigin: "196px 262px" }}>
          <path d="M182 268 C 194 270, 212 262, 220 246 C 210 250, 198 254, 190 258 C 184 261, 181 264, 182 268 Z" />
          <path d="M220 246 q2 -8 10 -10 q-6 -2 -10 2" strokeWidth={1.8} />
        </motion.g>
      );
    case "smoky":
      return (
        <motion.g {...common} {...entry} strokeWidth={1.9}>
          {[cx - 22, cx, cx + 22].map((x, i) => (
            <motion.path
              key={x}
              d={`M${x} ${liquidTop - 8} c -5 -10, 5 -14, 0 -24 c 5 -8, -3 -14, 1 -20`}
              animate={{ y: [0, -5, 0], opacity: [0.85, 0.45, 0.85] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
            />
          ))}
        </motion.g>
      );
    case "herbal":
      // a mint sprig standing in the pour
      return (
        <motion.g {...common} {...entry} style={{ transformOrigin: `${cx + 26}px ${liquidTop}px` }}>
          <path d={`M${cx + 26} ${liquidTop + 4} v-26`} />
          <path
            d={`M${cx + 26} ${liquidTop - 20} c -10 -4, -12 -14, -6 -20 c 8 2, 10 12, 6 20 Z`}
            strokeWidth={1.9}
          />
          <path
            d={`M${cx + 26} ${liquidTop - 20} c 10 -4, 12 -14, 6 -20 c -8 2, -10 12, -6 20 Z`}
            strokeWidth={1.9}
          />
          <path
            d={`M${cx + 20} ${liquidTop - 10} c -8 -2, -12 -8, -10 -14 c 7 1, 10 8, 10 14 Z`}
            strokeWidth={1.9}
          />
        </motion.g>
      );
    case "sour":
    case "citrusy":
      // citrus wheel on the rim
      return (
        <motion.g
          {...common}
          {...entry}
          style={{ transformOrigin: `${rimRight}px ${rimY - 6}px` }}
        >
          <circle cx={rimRight + 3} cy={rimY - 10} r={18} />
          <path
            d={`M${rimRight + 3} ${rimY - 28} v36 M${rimRight - 15} ${rimY - 10} h36 M${rimRight - 10} ${rimY - 23} l26 26 M${rimRight + 16} ${rimY - 23} l-26 26`}
            strokeWidth={1.4}
          />
        </motion.g>
      );
    case "fruity":
      // two cherries hooked over the rim, left side
      return (
        <motion.g {...common} {...entry} style={{ transformOrigin: `${rimLeft}px ${rimY}px` }}>
          <path d={`M${rimLeft + 4} ${rimY - 14} q 10 -12 8 26 M${rimLeft + 4} ${rimY - 14} q -12 8 -16 30`} strokeWidth={1.9} />
          <circle cx={rimLeft + 12} cy={rimY + 16} r={7.5} />
          <circle cx={rimLeft - 12} cy={rimY + 20} r={7.5} />
        </motion.g>
      );
    case "floral":
      // a small blossom by the rim, left
      return (
        <motion.g {...common} {...entry} strokeWidth={1.9} style={{ transformOrigin: `${rimLeft}px ${rimY - 12}px` }}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse
              key={a}
              cx={rimLeft}
              cy={rimY - 22}
              rx={4.5}
              ry={9}
              transform={`rotate(${a} ${rimLeft} ${rimY - 12})`}
            />
          ))}
          <circle cx={rimLeft} cy={rimY - 12} r={3.5} />
        </motion.g>
      );
    case "creamy":
      // a cream layer floated on top (rendered inside the clip)
      return (
        <motion.g {...common} {...entry}>
          <path
            d={`M${vessel.x} ${liquidTop - 2} q 14 -10 30 -2 t 30 0 t 30 0 t 30 0 t 30 0`}
            strokeWidth={3.4}
            opacity={0.95}
          />
          <path
            d={`M${vessel.x + 18} ${liquidTop - 12} h6 M${vessel.x + 52} ${liquidTop - 15} h6 M${vessel.x + 88} ${liquidTop - 12} h6`}
            strokeWidth={1.6}
          />
        </motion.g>
      );
    case "bubbly":
      return (
        <motion.g {...common} {...entry} strokeWidth={1.7} opacity={0.8}>
          {[
            [cx - 26, 18, 4],
            [cx + 6, 34, 5.5],
            [cx + 26, 16, 3.5],
            [cx - 8, 52, 4.5],
            [cx + 18, 64, 3],
          ].map(([x, dy, r]) => (
            <circle key={`${x}-${dy}`} cx={x} cy={liquidTop + (dy as number)} r={r} />
          ))}
        </motion.g>
      );
    case "boozy":
      // a second little pour tipping in at the rim
      return (
        <motion.g {...common} {...entry} style={{ transformOrigin: `${rimLeft}px ${rimY - 20}px` }}>
          <path
            d={`M${rimLeft - 18} ${rimY - 44} l20 8 -6 14 -20 -8 Z M${rimLeft - 4} ${rimY - 22} q 6 8 4 18`}
            strokeWidth={1.9}
          />
        </motion.g>
      );
    case "sweet":
      // a sugar cube dropping in, mid-sparkle
      return (
        <motion.g {...common} {...entry} strokeWidth={1.9} style={{ transformOrigin: `${rimLeft + 6}px ${rimY - 22}px` }}>
          <path d={`M${rimLeft - 4} ${rimY - 34} l18 -6 6 14 -18 7 Z`} />
          <path d={`M${rimLeft + 2} ${rimY - 29} l2 2 M${rimLeft + 9} ${rimY - 32} l2 2`} strokeWidth={1.4} />
          <path d={`M${rimLeft + 30} ${rimY - 40} v10 M${rimLeft + 25} ${rimY - 35} h10`} strokeWidth={1.6} />
        </motion.g>
      );
    case "bitter":
      // a twist of peel, wrung out over the pour
      return (
        <motion.g {...common} {...entry} strokeWidth={2} style={{ transformOrigin: `${rimLeft + 4}px ${rimY - 20}px` }}>
          <path d={`M${rimLeft - 10} ${rimY - 14} c 10 -14, 2 -22, 12 -30 c 10 -8, 20 0, 14 8 c -6 8, -16 4, -12 16`} />
          <path d={`M${rimLeft + 6} ${rimY - 6} l-1 5 M${rimLeft + 11} ${rimY - 7} l1 5`} strokeWidth={1.4} />
        </motion.g>
      );
    case "dry":
      // the air over a very dry pour
      return (
        <motion.g {...common} {...entry} strokeWidth={1.8} style={{ transformOrigin: `${rimLeft + 10}px ${rimY - 24}px` }}>
          <path d={`M${rimLeft - 6} ${rimY - 18} h12 M${rimLeft + 2} ${rimY - 30} h16 M${rimLeft + 14} ${rimY - 42} h12`} />
        </motion.g>
      );
    case "earthy":
      // three small stones by the foot
      return (
        <motion.g {...common} {...entry} strokeWidth={1.9}>
          <path d="M92 282 a7 6 0 1 1 14 0 a7 6 0 0 1 -14 0 Z" />
          <path d="M112 284 a5.5 5 0 1 1 11 0 a5.5 5 0 0 1 -11 0 Z" />
          <path d="M129 283 a4 3.5 0 1 1 8 0 a4 3.5 0 0 1 -8 0 Z" />
        </motion.g>
      );
    case "tart":
      // a pucker — tight burst at the rim
      return (
        <motion.g {...common} {...entry} strokeWidth={1.9} style={{ transformOrigin: `${rimLeft + 6}px ${rimY - 26}px` }}>
          <path
            d={`M${rimLeft + 6} ${rimY - 40} v8 M${rimLeft + 6} ${rimY - 20} v8 M${rimLeft - 8} ${rimY - 26} h8 M${rimLeft + 12} ${rimY - 26} h8 M${rimLeft - 4} ${rimY - 36} l6 6 M${rimLeft + 10} ${rimY - 22} l6 6 M${rimLeft + 16} ${rimY - 36} l-6 6 M${rimLeft + 2} ${rimY - 22} l-6 6`}
          />
        </motion.g>
      );
    default:
      // anything else — a hand-drawn sparkle
      return (
        <motion.g
          {...common}
          {...entry}
          strokeWidth={2}
          style={{ transformOrigin: `${rimLeft + 8}px ${rimY - 24}px` }}
        >
          <path d={`M${rimLeft + 8} ${rimY - 38} v28 M${rimLeft - 6} ${rimY - 24} h28`} />
          <path d={`M${rimLeft + 26} ${rimY - 44} v12 M${rimLeft + 20} ${rimY - 38} h12`} strokeWidth={1.6} />
        </motion.g>
      );
  }
}

/* ── The stage ──────────────────────────────────────────────────────── */

export default function DrinkStage({
  order,
  hasVibe,
  step,
}: {
  order: MixOrder;
  hasVibe: boolean;
  step: number;
}) {
  const vessel = VESSEL_BY_ALCOHOL[order.alcohol] ?? VESSELS.tall;
  const innerH = vessel.bottom - vessel.top;
  const liquidTop = hasVibe ? vessel.bottom - innerH * vessel.fill : vessel.bottom;

  const bright = order.sensory.fresh < 42;
  const punchy = order.sensory.soft > 58;
  const surprising = order.sensory.familiar > 58;
  const length = strengthToDrinkLength(order.sensory);
  const iced = length === "long";
  const spirit = BASE_SPIRITS.find((s) => s.key === order.baseSpirit);

  // The colour of the pour. Each mood has its own colour; a chosen spirit
  // takes the glass over with its own gradient (light head, dark base).
  // With neither, the palate sliders paint it.
  const moodColor = findVibePick(order.pickedLabel)?.color;
  const seed = spirit?.color ?? moodColor;
  // bright pours run a touch paler and cooler; deep pours a touch darker.
  const depth = (order.sensory.fresh - 50) / 100; // -0.5 bright … +0.5 deep
  const topColor = seed
    ? lerpHex(
        lerpHex(seed, "#ffffff", 0.38),
        depth < 0 ? "#eafaf6" : "#141b30",
        Math.abs(depth) * 0.5,
      )
    : lerpHex("#8fd8cf", "#3d5e8f", order.sensory.fresh / 100);
  const baseColor = seed
    ? lerpHex(
        lerpHex(seed, "#000000", 0.28),
        depth < 0 ? "#ffffff" : "#000000",
        Math.abs(depth) * 0.3,
      )
    : lerpHex("#e0b76a", "#c05a2e", order.sensory.soft / 100);

  // Only the first chosen note decorates the glass — they overlap otherwise.
  const firstFlavor = order.manualFlavors[0]?.toLowerCase();
  const flavorInGlass = firstFlavor === "creamy" || firstFlavor === "bubbly";
  const showGarnishFlavor =
    !!firstFlavor && !flavorInGlass && !(bright && (firstFlavor === "citrusy" || firstFlavor === "sour"));

  const parts: string[] = [];
  if (order.moodText.trim() || order.pickedLabel) parts.push("the mood");
  if (bright) parts.push("something bright");
  if (order.sensory.fresh > 58) parts.push("something deep");
  if (punchy) parts.push("a jolt");
  if (iced) parts.push("ice");
  if (length === "short") parts.push("fire");
  if (spirit) parts.push(spirit.en.toLowerCase());
  if (order.manualFlavors.length) parts.push(order.manualFlavors.join(" · ").toLowerCase());

  // Garnish anchored to the tall rim moves with the vessel's rim.
  const rimShift = `translate(${vessel.rimRight - 178}, ${vessel.rimY - 66})`;

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
              <clipPath id="stage-vessel-clip">
                <path d={vessel.clip} />
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

            <AnimatePresence mode="wait" initial={false}>
              <motion.g
                key={vessel.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Liquid — the mood, in colour */}
                <g clipPath="url(#stage-vessel-clip)">
                  <motion.rect
                    x={vessel.x}
                    width={vessel.w}
                    fill="url(#stage-liquid-grad)"
                    initial={false}
                    animate={{
                      y: liquidTop,
                      height: Math.max(0, vessel.bottom + 12 - liquidTop),
                      opacity: hasVibe ? 0.9 : 0,
                    }}
                    transition={{ type: "spring", stiffness: 130, damping: 20 }}
                    style={{ mixBlendMode: "screen" }}
                  />
                  {/* Surface line */}
                  {hasVibe && (
                    <motion.path
                      d={`M${vessel.x - 4} 0 C ${vessel.cx - 30} -7, ${vessel.cx + 30} 7, ${vessel.x + vessel.w + 4} -2`}
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
                        <path d={`M${vessel.cx - 34} ${liquidTop + 16} l30 -8 8 26 -30 9 Z`} />
                        <path d={`M${vessel.cx + 12} ${liquidTop + 34} l26 -6 6 24 -26 7 Z`} />
                      </motion.g>
                    )}
                  </AnimatePresence>

                  {/* Bubbles — always breathing, denser when the pour is bright */}
                  {hasVibe && (
                    <g stroke="currentColor" fill="none" strokeWidth="1.8" opacity="0.7">
                      {(bright
                        ? [vessel.cx - 24, vessel.cx - 8, vessel.cx + 6, vessel.cx + 20, vessel.cx + 32]
                        : [vessel.cx - 10, vessel.cx + 12, vessel.cx + 28]
                      ).map((cxx, i) => (
                        <circle key={cxx} cx={cxx} cy={0} r={2.6 + (i % 3)}>
                          <animate
                            attributeName="cy"
                            from={String(vessel.bottom - 6)}
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

                  {/* A flavour note that lives inside the glass */}
                  <AnimatePresence>
                    {hasVibe && flavorInGlass && firstFlavor && (
                      <FlavorDecor
                        key={firstFlavor}
                        label={firstFlavor}
                        vessel={vessel}
                        liquidTop={liquidTop}
                        index={0}
                      />
                    )}
                  </AnimatePresence>
                </g>

                {/* Vessel */}
                <g
                  filter={ROUGH}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {vessel.outline.map((d, i) => (
                    <path key={i} d={d} strokeWidth={i === 1 ? 3.6 : 3} />
                  ))}
                </g>

                {/* Flames licking off the top when it's one-and-done */}
                <AnimatePresence>
                  {length === "short" && hasVibe && (
                    <motion.g
                      key="flames"
                      filter={ROUGH}
                      stroke="currentColor"
                      strokeWidth="2.2"
                      fill="none"
                      strokeLinecap="round"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 0.95, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <motion.path
                        d={`M${vessel.cx - 22} ${vessel.rimY + 2} c -7 -12, 7 -16, 1 -30 c 9 10, 11 18, 4 30`}
                        animate={{ scaleY: [1, 1.14, 1], opacity: [0.9, 0.6, 0.9] }}
                        transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                        style={{ transformOrigin: `${vessel.cx - 22}px ${vessel.rimY + 2}px` }}
                      />
                      <motion.path
                        d={`M${vessel.cx + 2} ${vessel.rimY + 2} c -8 -16, 8 -20, 2 -38 c 11 13, 13 24, 5 38`}
                        animate={{ scaleY: [1, 1.2, 1], opacity: [0.95, 0.65, 0.95] }}
                        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                        style={{ transformOrigin: `${vessel.cx + 2}px ${vessel.rimY + 2}px` }}
                      />
                      <motion.path
                        d={`M${vessel.cx + 25} ${vessel.rimY + 2} c -6 -10, 6 -13, 1 -24 c 8 8, 9 15, 3 24`}
                        animate={{ scaleY: [1, 1.1, 1], opacity: [0.85, 0.55, 0.85] }}
                        transition={{ duration: 1.25, repeat: Infinity, ease: "easeInOut", delay: 0.45 }}
                        style={{ transformOrigin: `${vessel.cx + 25}px ${vessel.rimY + 2}px` }}
                      />
                    </motion.g>
                  )}
                </AnimatePresence>

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
                      transform={rimShift}
                      style={{ transformOrigin: `${vessel.rimRight}px ${vessel.rimY - 4}px` }}
                    >
                      <circle cx="181" cy="56" r="20" />
                      <path
                        d="M181 36 v40 M161 56 h40 M167 42 l28 28 M195 42 l-28 28"
                        strokeWidth="1.5"
                      />
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
                      style={{ transformOrigin: `${vessel.cx}px ${vessel.rimY + 60}px` }}
                    >
                      <path
                        d={`M${vessel.cx - 24} ${vessel.rimY - 34} L${vessel.cx + 8} ${vessel.bottom - 26}`}
                      />
                      <circle cx={vessel.cx - 27} cy={vessel.rimY - 40} r="8" fill="none" />
                    </motion.g>
                  )}
                </AnimatePresence>

                {/* The flavour garnish hung on the glass */}
                <AnimatePresence>
                  {hasVibe && showGarnishFlavor && firstFlavor && (
                    <FlavorDecor
                      key={firstFlavor}
                      label={firstFlavor}
                      vessel={vessel}
                      liquidTop={liquidTop}
                      index={0}
                    />
                  )}
                </AnimatePresence>
              </motion.g>
            </AnimatePresence>
          </svg>
        </div>

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
