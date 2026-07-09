"use client";

import { motion } from "framer-motion";

interface GlassVesselProps {
  size?: number;
  color?: string;
  mode?: "idle" | "mixing" | "thumb";
  glow?: boolean;
}

function hexToRgba(hex: string, a: number): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return `rgba(201,111,84,${a})`;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * Dark-mode glass vessel — a semi-transparent bottle silhouette with an inner
 * mood-tinted liquid, breathing halo and drifting particles. Reused across
 * landing, step headers, gallery thumbnails, and result frames.
 */
export default function GlassVessel({
  size = 220,
  color = "#C96F54",
  mode = "idle",
  glow = true,
}: GlassVesselProps) {
  const isMixing = mode === "mixing";
  const isThumb = mode === "thumb";

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {glow && !isThumb && (
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 55%, ${hexToRgba(color, 0.35)} 0%, ${hexToRgba(color, 0.10)} 45%, transparent 70%)`,
            filter: "blur(28px)",
          }}
          animate={{
            opacity: isMixing ? [0.55, 0.9, 0.55] : [0.4, 0.7, 0.4],
            scale:   isMixing ? [1, 1.08, 1]      : [1, 1.05, 1],
          }}
          transition={{ duration: isMixing ? 2.4 : 5.2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <motion.div
        className={`relative z-10 ${isMixing ? "vibe-bottle-shaker vibe-bottle-shaker--mixing" : mode === "idle" ? "vibe-bottle-shaker vibe-bottle-shaker--idle" : ""}`}
        style={{ width: size * 0.55, height: size * 0.82 }}
        animate={mode === "idle" ? { y: [0, -4, 0] } : {}}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width="100%" height="100%" viewBox="0 0 100 150" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="gv-glass" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.14)" />
              <stop offset="50%" stopColor="rgba(255,255,255,0.05)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.10)" />
            </linearGradient>
            <linearGradient id="gv-liquid" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={hexToRgba(color, 0.85)} />
              <stop offset="100%" stopColor={hexToRgba(color, 0.55)} />
            </linearGradient>
            <clipPath id="gv-clip">
              <path d="M 32,54 L 68,54 L 62,132 C 62,138 58,140 50,140 C 42,140 38,138 38,132 Z" />
            </clipPath>
          </defs>

          {/* cap */}
          <path d="M 40,15 L 60,15 L 58,30 L 42,30 Z"
            fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
          {/* neck */}
          <path d="M 32,30 L 68,30 C 74,30 76,38 72,46 L 68,54 L 32,54 L 28,46 C 24,38 26,30 32,30 Z"
            fill="url(#gv-glass)" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
          {/* body */}
          <path d="M 32,54 L 68,54 L 62,132 C 62,138 58,140 50,140 C 42,140 38,138 38,132 Z"
            fill="url(#gv-glass)" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />

          {/* liquid inside body, lagged sinusoidal surface */}
          <g clipPath="url(#gv-clip)">
            <motion.path
              d="M 20,95 Q 35,90 50,95 T 80,95 L 80,150 L 20,150 Z"
              fill="url(#gv-liquid)"
              animate={{
                d: [
                  "M 20,95 Q 35,90 50,95 T 80,95 L 80,150 L 20,150 Z",
                  "M 20,93 Q 35,98 50,93 T 80,93 L 80,150 L 20,150 Z",
                  "M 20,95 Q 35,90 50,95 T 80,95 L 80,150 L 20,150 Z",
                ],
              }}
              transition={{ duration: isMixing ? 1.6 : 3.4, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* bubbles */}
            {isMixing && [0, 1, 2, 3].map((i) => (
              <motion.circle
                key={i}
                cx={40 + i * 5}
                cy={130}
                r={1.2 + (i % 2) * 0.6}
                fill="rgba(255,255,255,0.55)"
                animate={{ cy: [130, 96], opacity: [0, 0.8, 0] }}
                transition={{ duration: 2 + i * 0.4, repeat: Infinity, delay: i * 0.3, ease: "easeIn" }}
              />
            ))}
          </g>

          {/* highlight sheen */}
          <path d="M 38,60 L 42,60 L 44,120 L 41,128"
            stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
        </svg>
      </motion.div>

      {/* Drifting particles around vessel */}
      {!isThumb && (
        <div className="absolute inset-0 pointer-events-none">
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const angle = (i / 6) * Math.PI * 2;
            const rad = size * 0.42;
            const x = 50 + (Math.cos(angle) * rad) / (size / 100);
            const y = 55 + (Math.sin(angle) * rad) / (size / 100);
            return (
              <motion.span
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: 3,
                  height: 3,
                  background: hexToRgba(color, 0.55),
                  boxShadow: `0 0 6px ${hexToRgba(color, 0.6)}`,
                }}
                animate={{
                  y: [0, -12, 0],
                  opacity: [0.15, 0.55, 0.15],
                }}
                transition={{
                  duration: 4 + i * 0.3,
                  repeat: Infinity,
                  delay: i * 0.4,
                  ease: "easeInOut",
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
