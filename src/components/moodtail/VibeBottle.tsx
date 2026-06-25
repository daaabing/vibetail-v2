"use client";

import { motion } from "framer-motion";

export type VibeBottleMode = "idle" | "mixing";

interface VibeBottleProps {
  /** Hex color for accent glow. */
  color?: string;
  /** Visual scale in px (square). */
  size?: number;
  /** idle = gentle sway, mixing = full shake + splash particles. */
  mode?: VibeBottleMode;
  /** Show outer glow halo. Defaults true. */
  glow?: boolean;
}

function hexToRgba(hex: string, a: number): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return `rgba(224,83,60,${a})`;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Animated cocktail shaker — shakes side-to-side with splash particles.
 */
export default function VibeBottle({
  color = "#E0533C",
  size = 220,
  mode = "idle",
  glow = true,
}: VibeBottleProps) {
  const isMixing = mode === "mixing";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Outer glow */}
      {glow && (
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 55%, ${hexToRgba(color, 0.35)} 0%, ${hexToRgba(color, 0.10)} 45%, transparent 72%)`,
            filter: "blur(22px)",
          }}
          animate={{
            opacity: isMixing ? [0.7, 1, 0.7] : [0.55, 0.8, 0.55],
            scale: isMixing ? [1, 1.08, 1] : [1, 1.04, 1],
          }}
          transition={{
            duration: isMixing ? 2.2 : 4.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Shaker */}
      <div
        className={`relative z-10 filter drop-shadow-md vibe-bottle-shaker ${isMixing ? "vibe-bottle-shaker--mixing" : "vibe-bottle-shaker--idle"}`}
        style={{ width: size * 0.55, height: size * 0.78 }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* cap */}
          <path
            d="M 40,15 L 60,15 L 58,30 L 42,30 Z"
            fill="#E2E8F0"
            stroke="#94A3B8"
            strokeWidth="3"
          />
          {/* neck */}
          <path
            d="M 32,30 L 68,30 C 74,30 76,38 72,46 L 68,54 L 32,54 L 28,46 C 24,38 26,30 32,30 Z"
            fill="#F1F5F9"
            stroke="#94A3B8"
            strokeWidth="3"
          />
          {/* body */}
          <path
            d="M 32,54 L 68,54 L 62,125 C 62,130 58,132 50,132 C 42,132 38,130 38,125 Z"
            fill="#E2E8F0"
            stroke="#94A3B8"
            strokeWidth="3"
          />
          {/* highlight */}
          <path
            d="M 38,60 L 42,60 L 44,115 L 41,122"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.6"
          />

          {/* splash particles (only while mixing) */}
          {isMixing && (
            <>
              <motion.circle
                cx="50"
                cy="20"
                r="3"
                fill="#FDA4AF"
                animate={{
                  y: [-15, -45],
                  x: [0, -30],
                  opacity: [1, 0],
                  scale: [0.8, 1.2],
                }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <motion.circle
                cx="50"
                cy="20"
                r="4.5"
                fill="#818CF8"
                animate={{
                  y: [-15, -40],
                  x: [0, 35],
                  opacity: [1, 0],
                  scale: [0.8, 1.3],
                }}
                transition={{ duration: 1.4, repeat: Infinity, delay: 0.3 }}
              />
              <motion.circle
                cx="50"
                cy="20"
                r="2.5"
                fill={color}
                animate={{
                  y: [-15, -38],
                  x: [0, 4],
                  opacity: [1, 0],
                  scale: [0.7, 1.1],
                }}
                transition={{ duration: 1.1, repeat: Infinity, delay: 0.15 }}
              />
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
