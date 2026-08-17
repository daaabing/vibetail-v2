import { motion } from "framer-motion";
import { ROUGH } from "./Sketch.js";
import type { AlcoholLevel } from "../../lib/mix-flow.js";

/**
 * The alcohol picker is a glass you pour yourself: click low in the glass for
 * zero-proof, click at the rim to fill it to the top and get something strong.
 */

const LEVELS: { value: AlcoholLevel; fill: number; en: string }[] = [
  { value: "zero", fill: 0.0, en: "Zero proof" },
  { value: "low", fill: 0.36, en: "Light" },
  { value: "standard", fill: 0.66, en: "Standard" },
  { value: "strong", fill: 0.96, en: "Strong" },
];

// Glass interior, in viewBox units.
const TOP = 30;
const BOTTOM = 168;
const INNER_H = BOTTOM - TOP;

const GLASS_OUTER = "M26 22 H114 L104 166 a7 7 0 0 1 -7 6 H43 a7 7 0 0 1 -7 -6 Z";

export default function PourCup({
  value,
  onChange,
}: {
  value: AlcoholLevel;
  onChange: (v: AlcoholLevel) => void;
}) {
  const current = LEVELS.find((l) => l.value === value) ?? LEVELS[2]!;
  const fillTop = BOTTOM - INNER_H * current.fill;

  return (
    <div className="flex items-center gap-6 sm:gap-10">
      <svg
        viewBox="0 0 140 190"
        width="180"
        height="244"
        role="radiogroup"
        aria-label={"Alcohol level"}
        style={{ overflow: "visible", flex: "none", color: "var(--ink)" }}
      >
        <defs>
          <clipPath id="pourcup-inside">
            <path d={GLASS_OUTER} />
          </clipPath>
        </defs>

        {/* Liquid */}
        <g clipPath="url(#pourcup-inside)">
          <motion.rect
            x="20"
            width="104"
            fill="var(--gold-bright, #c9a25c)"
            opacity="0.55"
            initial={{ y: fillTop, height: Math.max(0, BOTTOM + 8 - fillTop) }}
            animate={{ y: fillTop, height: Math.max(0, BOTTOM + 8 - fillTop) }}
            transition={{ type: "spring", stiffness: 180, damping: 22 }}
          />
          {/* Surface ripple, so the pour reads as liquid not a bar chart */}
          {current.fill > 0 && (
            <motion.path
              initial={false}
              d={`M18 0 C 46 -6, 74 6, 126 -2`}
              stroke="var(--ink)"
              strokeWidth="2.4"
              fill="none"
              strokeLinecap="round"
              filter={ROUGH}
              animate={{ y: fillTop }}
              transition={{ type: "spring", stiffness: 180, damping: 22 }}
            />
          )}
        </g>

        {/* Glass */}
        <g
          filter={ROUGH}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={GLASS_OUTER} />
          <path d="M26 22 H114" strokeWidth="3.2" />
        </g>

        {/* Click bands — one per level, bottom of the glass upward */}
        {LEVELS.map((l, i) => {
          const bandTop = BOTTOM - (INNER_H / LEVELS.length) * (i + 1);
          const selected = l.value === value;
          return (
            <g key={l.value}>
              <rect
                x="24"
                y={bandTop}
                width="92"
                height={INNER_H / LEVELS.length}
                fill="transparent"
                style={{ cursor: "pointer" }}
                role="radio"
                aria-checked={selected}
                aria-label={l.en}
                tabIndex={0}
                onClick={() => onChange(l.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChange(l.value);
                  }
                }}
              />
              {/* Tick on the right edge */}
              <g
                filter={ROUGH}
                stroke="currentColor"
                strokeWidth={selected ? "2.6" : "1.6"}
                opacity={selected ? 1 : 0.35}
                strokeLinecap="round"
              >
                <path d={`M112 ${bandTop + 1} h14`} />
              </g>
            </g>
          );
        })}
      </svg>

      {/* Labels — clickable too, so the control is never a guessing game */}
      <ul className="flex flex-col-reverse gap-1">
        {LEVELS.map((l) => {
          const selected = l.value === value;
          return (
            <li key={l.value}>
              <button
                type="button"
                onClick={() => onChange(l.value)}
                className="flex items-baseline gap-2.5 py-1.5 text-left"
              >
                <span
                  className="hand text-[26px]"
                  style={{
                    color: selected ? "var(--gold)" : "var(--ink-faint)",
                    transition: "color 160ms ease",
                  }}
                >
                  {l.en}
                </span>
                {selected && (
                  <span className="note text-[15px]" style={{ color: "var(--ink-mute)" }}>
                    ←
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
