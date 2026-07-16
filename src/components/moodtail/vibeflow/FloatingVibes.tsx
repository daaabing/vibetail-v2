import { motion, AnimatePresence } from "framer-motion";
import { QUICK_VIBES, type VibeKey } from "@/lib/vibeflow";
import type { Lang } from "@/lib/i18n";

interface Props {
  lang: Lang;
  selected: VibeKey | null;
  onPick: (key: VibeKey) => void;
}

// Softly staggered pill positions — feels like a hand-placed cloud, not
// a form grid. Coordinates are in em so it scales with the container font.
const PLACEMENT = [
  { top: "4%",  left: "8%",  scale: 1.02, delay: 0.05 },
  { top: "6%",  left: "58%", scale: 0.95, delay: 0.12 },
  { top: "34%", left: "2%",  scale: 1.08, delay: 0.19 },
  { top: "38%", left: "62%", scale: 1.02, delay: 0.26 },
  { top: "66%", left: "14%", scale: 0.98, delay: 0.33 },
  { top: "68%", left: "56%", scale: 1.05, delay: 0.4 },
  { top: "88%", left: "36%", scale: 0.94, delay: 0.47 },
];

export default function FloatingVibes({ lang, selected, onPick }: Props) {
  return (
    <div className="relative w-full" style={{ height: 220 }}>
      <AnimatePresence>
        {QUICK_VIBES.map((v, i) => {
          const p = PLACEMENT[i];
          const isSel = selected === v.key;
          const isOther = selected !== null && !isSel;
          const label = lang === "zh" ? v.labelZh : v.labelEn;
          return (
            <motion.button
              key={v.key}
              type="button"
              onClick={() => onPick(v.key)}
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{
                opacity: isOther ? 0.4 : 1,
                y: [0, -3, 0, 3, 0],
                scale: isSel ? p.scale * 1.08 : p.scale * (isOther ? 0.92 : 1),
              }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{
                opacity: { duration: 0.3, delay: p.delay },
                scale: { type: "spring", stiffness: 260, damping: 22 },
                y: {
                  duration: 5 + (i % 3),
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: p.delay,
                },
              }}
              whileTap={{ scale: p.scale * 0.9 }}
              className="absolute whitespace-nowrap rounded-full text-xs"
              style={{
                top: p.top,
                left: p.left,
                padding: "8px 14px",
                fontFamily: "var(--font-body)",
                border: isSel
                  ? `1.4px solid ${v.color}`
                  : "1px solid rgba(255,255,255,0.10)",
                background: isSel
                  ? `${v.color}22`
                  : "rgba(255,255,255,0.045)",
                backdropFilter: "blur(10px) saturate(140%)",
                color: isSel ? "var(--app-text)" : "var(--app-text-secondary)",
                boxShadow: isSel
                  ? `0 0 0 3px ${v.color}18, 0 0 22px ${v.color}55`
                  : "none",
              }}
            >
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: 999,
                  background: v.color,
                  marginRight: 7,
                  verticalAlign: "middle",
                  boxShadow: isSel ? `0 0 6px ${v.color}` : "none",
                }}
              />
              {label}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
