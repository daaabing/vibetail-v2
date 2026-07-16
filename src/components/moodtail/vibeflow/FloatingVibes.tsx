import { useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { Lang } from "@/lib/i18n";
import { VIBE_ROWS_EN, VIBE_ROWS_ZH } from "@/lib/vibe-cloud";

interface Props {
  lang: Lang;
  selected: string | null;
  onPick: (label: string, color: string) => void;
}

/**
 * Central vibe cloud — all pills sit inside one soft container, wrap
 * naturally, and each pill drifts a few pixels around its own resting spot.
 * No marquee, no horizontal scroll — the cloud stays put.
 */
export default function FloatingVibes({ lang, selected, onPick }: Props) {
  const rows = lang === "zh" ? VIBE_ROWS_ZH : VIBE_ROWS_EN;
  const items = useMemo(
    () => rows.flatMap((r) => r.labels.map((label) => ({ label, color: r.color }))),
    [rows],
  );
  const anyPicked = !!selected;

  return (
    <div
      className="relative w-full mx-auto"
      style={{
        maxWidth: "calc(100vw - 32px)",
        height: 260,
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        maskImage:
          "linear-gradient(180deg, transparent 0, black 10%, black 88%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(180deg, transparent 0, black 10%, black 88%, transparent 100%)",
      }}
    >
      <div className="flex flex-wrap justify-center gap-1.5 px-2 py-3">
        {items.map((it, i) => {
          const isSel = selected === it.label;
          return (
            <FloatChip
              key={`${it.label}-${i}`}
              idx={i}
              label={it.label}
              color={it.color}
              selected={isSel}
              dimmed={anyPicked && !isSel}
              onPick={onPick}
            />
          );
        })}
      </div>
    </div>
  );
}

// Deterministic float configs so we don't hydration-mismatch or jitter.
// Small movement only — 4–10px, ≤1.5deg.
const FLOAT_CONFIGS = [
  { fx: 6, fy: -5, r: 1.0, d: 6.2 },
  { fx: -5, fy: 7, r: -1.2, d: 7.1 },
  { fx: 4, fy: 6, r: 0.8, d: 5.6 },
  { fx: -6, fy: -4, r: -0.9, d: 7.4 },
  { fx: 8, fy: 3, r: 1.3, d: 6.8 },
  { fx: -4, fy: -6, r: -1.0, d: 5.9 },
  { fx: 5, fy: -7, r: 1.1, d: 7.6 },
  { fx: -7, fy: 4, r: -1.3, d: 6.4 },
  { fx: 3, fy: 8, r: 0.6, d: 5.4 },
  { fx: -5, fy: -3, r: -0.7, d: 7.0 },
  { fx: 7, fy: 5, r: 1.4, d: 6.6 },
  { fx: -3, fy: -8, r: -1.1, d: 5.8 },
];

function FloatChip({
  idx,
  label,
  color,
  selected,
  dimmed,
  onPick,
}: {
  idx: number;
  label: string;
  color: string;
  selected: boolean;
  dimmed: boolean;
  onPick: (label: string, color: string) => void;
}) {
  const reduce = useReducedMotion();
  const cfg = FLOAT_CONFIGS[idx % FLOAT_CONFIGS.length];
  const delay = (idx % 11) * 0.23;

  // Slight size variation based on text length (not random).
  const len = label.length;
  const fontSize = len <= 3 ? 11 : len >= 12 ? 12.5 : 12;
  const padY = len <= 3 ? 5 : 6;
  const padX = len <= 3 ? 10 : 12;

  return (
    <motion.button
      type="button"
      onClick={() => onPick(label, color)}
      animate={
        reduce
          ? undefined
          : {
              x: [0, cfg.fx, 0, -cfg.fx * 0.6, 0],
              y: [0, cfg.fy, cfg.fy * 0.4, -cfg.fy * 0.5, 0],
              rotate: [0, cfg.r, 0, -cfg.r * 0.7, 0],
            }
      }
      transition={
        reduce
          ? undefined
          : {
              duration: cfg.d,
              repeat: Infinity,
              ease: "easeInOut",
              delay,
            }
      }
      whileTap={{ scale: 0.94 }}
      className="shrink-0 rounded-full"
      style={{
        fontFamily: "var(--font-body)",
        fontSize,
        padding: `${padY}px ${padX}px`,
        lineHeight: 1.1,
        border: selected
          ? `1.4px solid ${color}`
          : "1px solid rgba(255,255,255,0.10)",
        background: selected
          ? `${color}2E`
          : "rgba(255,255,255,0.045)",
        color: selected ? "var(--app-text)" : "var(--app-text-secondary)",
        opacity: dimmed ? 0.5 : 1,
        transform: selected ? "scale(1.04)" : undefined,
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        boxShadow: selected ? `0 0 14px ${color}55` : "none",
        transition: "background 200ms, border-color 200ms, opacity 200ms",
        willChange: "transform",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 5,
          height: 5,
          borderRadius: 999,
          background: color,
          marginRight: 6,
          verticalAlign: "middle",
          opacity: selected ? 1 : 0.7,
        }}
      />
      {label}
    </motion.button>
  );
}
