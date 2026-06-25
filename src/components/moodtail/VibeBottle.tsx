"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

export type VibeBottleMode = "idle" | "mixing";

interface VibeBottleProps {
  /** Hex color for the liquid. */
  color?: string;
  /** Visual scale in px (square). */
  size?: number;
  /** idle = gentle breathing, mixing = swirl + bubbles + sparks. */
  mode?: VibeBottleMode;
  /** Show outer glow halo. Defaults true. */
  glow?: boolean;
}

/** Perceived brightness of a hex color (0..1). */
function luminance(hex: string): number {
  const m = hex.replace("#", "");
  if (m.length !== 6) return 0.5;
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
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
 * High-quality glass bottle visual.
 * Liquid color reflects the user's current vibe; bubbles/swirl pick up in `mixing`.
 */
export default function VibeBottle({
  color = "#E0533C",
  size = 220,
  mode = "idle",
  glow = true,
}: VibeBottleProps) {
  const lum = luminance(color);
  const isMixing = mode === "mixing";

  // Vertically stable IDs across renders so multiple bottles don't clash.
  const uid = useMemo(() => Math.random().toString(36).slice(2, 8), []);
  const liquidGrad = `vb-liquid-${uid}`;
  const glassGrad = `vb-glass-${uid}`;
  const shineGrad = `vb-shine-${uid}`;
  const liquidClip = `vb-clip-${uid}`;
  const blur = `vb-blur-${uid}`;

  const bubbles = useMemo(
    () =>
      Array.from({ length: isMixing ? 9 : 5 }).map((_, i) => ({
        cx: 38 + ((i * 17) % 44),
        r: 1.6 + (i % 3) * 0.7,
        delay: (i * 0.45) % 3.2,
        dur: 2.6 + (i % 4) * 0.5,
      })),
    [isMixing],
  );

  const sparkles = useMemo(
    () =>
      Array.from({ length: isMixing ? 7 : 0 }).map((_, i) => ({
        x: 20 + ((i * 23) % 80),
        y: 30 + ((i * 13) % 70),
        delay: (i * 0.3) % 2,
      })),
    [isMixing],
  );

  // Bright vibe → tall lively liquid; calm → mid level; deep → fuller, slower
  const fillTop = lum > 0.65 ? 78 : lum < 0.35 ? 56 : 66;

  return (
    <div
      className="relative inline-block"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {/* Outer glow */}
      {glow && (
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 55%, ${hexToRgba(color, 0.38)} 0%, ${hexToRgba(color, 0.12)} 40%, transparent 70%)`,
            filter: "blur(22px)",
          }}
          animate={{
            opacity: isMixing ? [0.7, 1, 0.7] : [0.55, 0.8, 0.55],
            scale: isMixing ? [1, 1.08, 1] : [1, 1.04, 1],
          }}
          transition={{
            duration: isMixing ? 2.4 : 4.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      {/* Breathing bottle */}
      <motion.svg
        viewBox="0 0 140 200"
        width={size}
        height={size}
        className="relative z-10"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          {/* Liquid gradient — color-aware */}
          <linearGradient id={liquidGrad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.9} />
            <stop offset="60%" stopColor={color} stopOpacity={0.95} />
            <stop
              offset="100%"
              stopColor={lum > 0.5 ? color : "#1a0f0a"}
              stopOpacity={0.85}
            />
          </linearGradient>

          {/* Glass body */}
          <linearGradient id={glassGrad} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.12)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.35)" />
          </linearGradient>

          {/* Specular shine */}
          <linearGradient id={shineGrad} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>

          <filter id={blur} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>

          {/* Inner bottle shape used to clip liquid */}
          <clipPath id={liquidClip}>
            <path d="M58 36 Q58 60 48 70 Q28 88 28 122 L28 168 Q28 184 44 184 L96 184 Q112 184 112 168 L112 122 Q112 88 92 70 Q82 60 82 36 Z" />
          </clipPath>
        </defs>

        {/* Cork / cap */}
        <rect
          x="56"
          y="16"
          width="28"
          height="14"
          rx="3"
          fill="#c9a98a"
          stroke="#8b6f4e"
          strokeWidth="1"
        />
        <rect x="56" y="22" width="28" height="2" fill="#8b6f4e" opacity="0.4" />

        {/* Glass body (outline + soft fill) */}
        <path
          d="M58 30 L58 36 Q58 60 48 70 Q28 88 28 122 L28 168 Q28 184 44 184 L96 184 Q112 184 112 168 L112 122 Q112 88 92 70 Q82 60 82 36 L82 30 Z"
          fill={`url(#${glassGrad})`}
          stroke="rgba(60,40,30,0.35)"
          strokeWidth="1.2"
        />

        {/* Liquid (clipped to bottle interior) */}
        <g clipPath={`url(#${liquidClip})`}>
          {/* Liquid base */}
          <rect
            x="0"
            y={fillTop}
            width="140"
            height="200"
            fill={`url(#${liquidGrad})`}
          />

          {/* Animated wave surface */}
          <motion.path
            d={`M-20 ${fillTop} Q20 ${fillTop - 4} 60 ${fillTop} T140 ${fillTop} T220 ${fillTop} L220 200 L-20 200 Z`}
            fill={hexToRgba(color, 0.95)}
            animate={{ x: [-40, 0, -40] }}
            transition={{
              duration: isMixing ? 3.2 : 5.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Secondary lighter wave (top highlight) */}
          <motion.path
            d={`M-20 ${fillTop + 2} Q20 ${fillTop - 1} 60 ${fillTop + 2} T140 ${fillTop + 2} T220 ${fillTop + 2} L220 ${fillTop + 8} L-20 ${fillTop + 8} Z`}
            fill="rgba(255,255,255,0.35)"
            animate={{ x: [0, -40, 0] }}
            transition={{
              duration: isMixing ? 2.8 : 4.6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Rising bubbles */}
          {bubbles.map((b, i) => (
            <motion.circle
              key={i}
              cx={b.cx}
              cy={180}
              r={b.r}
              fill="rgba(255,255,255,0.75)"
              filter={`url(#${blur})`}
              animate={{
                cy: [180, fillTop + 4],
                opacity: [0, 0.9, 0],
                cx: [b.cx, b.cx + (i % 2 === 0 ? 4 : -4), b.cx],
              }}
              transition={{
                duration: b.dur,
                delay: b.delay,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          ))}

          {/* Swirl glow (only mixing) */}
          {isMixing && (
            <motion.ellipse
              cx="70"
              cy={fillTop + 30}
              rx="38"
              ry="10"
              fill="rgba(255,255,255,0.18)"
              animate={{ rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              style={{ transformOrigin: `70px ${fillTop + 30}px` }}
            />
          )}
        </g>

        {/* Glass specular highlight */}
        <path
          d="M40 92 Q34 124 40 168"
          stroke={`url(#${shineGrad})`}
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          opacity="0.65"
        />
        {/* Tiny glint on shoulder */}
        <circle cx="56" cy="64" r="2.2" fill="rgba(255,255,255,0.9)" />

        {/* Bottle rim shadow */}
        <ellipse
          cx="70"
          cy="36"
          rx="13"
          ry="2"
          fill="rgba(0,0,0,0.18)"
        />
      </motion.svg>

      {/* Floating sparks (mixing only) */}
      {sparkles.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: 4,
            height: 4,
            background: hexToRgba(color, 0.9),
            boxShadow: `0 0 8px ${hexToRgba(color, 0.7)}`,
          }}
          animate={{
            y: [-2, -16, -2],
            opacity: [0, 1, 0],
            scale: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 2.6,
            delay: s.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
