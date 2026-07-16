import { motion } from "framer-motion";
import { useRef, useCallback } from "react";

interface Props {
  value: number;                        // 0–100
  onChange: (v: number) => void;
  leftLabel: string;
  rightLabel: string;
  accent?: string;
}

/**
 * Symmetric dual-direction slider. Center = 50. Drag or tap either
 * side / end label. Emits values 0–100. Track has no numeric marks.
 */
export default function SensoryControl({
  value,
  onChange,
  leftLabel,
  rightLabel,
  accent = "var(--app-primary)",
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  const setFromPointer = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const t = (clientX - rect.left) / rect.width;
      const v = Math.max(0, Math.min(100, Math.round(t * 100)));
      onChange(v);
    },
    [onChange],
  );

  return (
    <div className="w-full select-none">
      <div className="flex items-center justify-between text-[11px] tracking-wide mb-2">
        <button
          type="button"
          onClick={() => onChange(15)}
          style={{
            fontFamily: "var(--font-body)",
            color: value < 45 ? "var(--app-text)" : "var(--app-text-muted)",
          }}
        >
          {leftLabel}
        </button>
        <button
          type="button"
          onClick={() => onChange(85)}
          style={{
            fontFamily: "var(--font-body)",
            color: value > 55 ? "var(--app-text)" : "var(--app-text-muted)",
          }}
        >
          {rightLabel}
        </button>
      </div>

      <div
        ref={trackRef}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          setFromPointer(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons !== 1) return;
          setFromPointer(e.clientX);
        }}
        className="relative h-8 flex items-center cursor-pointer"
      >
        <div
          className="absolute left-0 right-0 rounded-full"
          style={{
            height: 3,
            background:
              "linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.16), rgba(255,255,255,0.08))",
          }}
        />
        {/* Center tick */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            width: 2,
            height: 8,
            borderRadius: 1,
            background: "rgba(255,255,255,0.16)",
          }}
        />
        {/* Filled band from center to thumb */}
        <div
          className="absolute rounded-full"
          style={{
            height: 3,
            left: value < 50 ? `${value}%` : "50%",
            right: value > 50 ? `${100 - value}%` : "50%",
            background: accent,
            opacity: 0.65,
          }}
        />
        {/* Thumb */}
        <motion.div
          animate={{ left: `${value}%` }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{
            top: "50%",
            width: 18,
            height: 18,
            borderRadius: 999,
            background: "rgba(28,30,34,0.95)",
            border: `1.5px solid ${accent}`,
            boxShadow: `0 0 0 4px ${accent}22, 0 2px 10px rgba(0,0,0,0.5)`,
          }}
        />
      </div>
    </div>
  );
}
