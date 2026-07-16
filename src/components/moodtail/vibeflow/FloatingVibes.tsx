import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { Lang } from "@/lib/i18n";
import { VIBE_ROWS_EN, VIBE_ROWS_ZH, type VibeCloudRow } from "@/lib/vibe-cloud";

interface Props {
  lang: Lang;
  /** Currently picked chip label (raw string) or null. */
  selected: string | null;
  onPick: (label: string, color: string) => void;
}

/**
 * Drifting cloud of vibe chips — rows alternate direction and gently float
 * horizontally. Tapping a chip picks it. Fills the center of the screen.
 */
export default function FloatingVibes({ lang, selected, onPick }: Props) {
  const rows = lang === "zh" ? VIBE_ROWS_ZH : VIBE_ROWS_EN;

  return (
    <div
      className="relative w-full overflow-hidden"
      style={{
        height: 300,
        maskImage:
          "linear-gradient(90deg, transparent 0, black 8%, black 92%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(90deg, transparent 0, black 8%, black 92%, transparent 100%)",
      }}
    >
      <div className="flex flex-col justify-center h-full gap-3 py-2">
        {rows.map((row, i) => (
          <DriftRow
            key={i}
            row={row}
            selected={selected}
            onPick={onPick}
            speed={44 + i * 6}
          />
        ))}
      </div>
    </div>
  );
}

function DriftRow({
  row,
  selected,
  onPick,
  speed,
}: {
  row: VibeCloudRow;
  selected: string | null;
  onPick: (label: string, color: string) => void;
  speed: number;
}) {
  // Duplicate labels for a seamless marquee loop.
  const track = [...row.labels, ...row.labels];
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    let last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      if (!pausedRef.current && trackRef.current) {
        const el = trackRef.current;
        const halfWidth = el.scrollWidth / 2;
        offsetRef.current += (row.dir === "rtl" ? -1 : 1) * speed * dt;
        // wrap
        if (row.dir === "rtl" && offsetRef.current <= -halfWidth) {
          offsetRef.current += halfWidth;
        } else if (row.dir === "ltr" && offsetRef.current >= 0) {
          offsetRef.current -= halfWidth;
        }
        el.style.transform = `translate3d(${offsetRef.current}px,0,0)`;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    // Seed offset so ltr rows don't blank on first frame.
    if (row.dir === "ltr") offsetRef.current = -1;
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [row.dir, speed]);

  return (
    <div
      className="relative w-full"
      style={{ touchAction: "pan-x pan-y" }}
      onPointerEnter={() => (pausedRef.current = true)}
      onPointerLeave={() => (pausedRef.current = false)}
    >
      <div
        ref={trackRef}
        className="flex gap-2 whitespace-nowrap will-change-transform"
      >
        {track.map((label, i) => {
          const isSel = selected === label;
          return (
            <motion.button
              key={`${label}-${i}`}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => onPick(label, row.color)}
              className="shrink-0 rounded-full px-3.5 py-1.5 text-xs"
              style={{
                fontFamily: "var(--font-body)",
                border: isSel
                  ? `1.4px solid ${row.color}`
                  : "1px solid rgba(255,255,255,0.10)",
                background: isSel
                  ? `${row.color}2E`
                  : "rgba(255,255,255,0.045)",
                color: isSel ? "var(--app-text)" : "var(--app-text-secondary)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                boxShadow: isSel ? `0 0 14px ${row.color}66` : "none",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 5,
                  height: 5,
                  borderRadius: 999,
                  background: row.color,
                  marginRight: 6,
                  verticalAlign: "middle",
                  opacity: isSel ? 1 : 0.7,
                }}
              />
              {label}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
