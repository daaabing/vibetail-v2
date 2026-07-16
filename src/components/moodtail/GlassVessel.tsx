"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface GlassVesselProps {
  /** Visual height of the bottle in px. The width is derived from the 220×420 viewBox. */
  size?: number;
  color?: string;
  mode?: "idle" | "mixing" | "thumb";
  glow?: boolean;
  /** Optional fill 0–100. Defaults to 60 when uncontrolled. */
  sliderVal?: number;
  /** If provided, the bottle body becomes a vertical drag control. */
  onSliderValChange?: (val: number) => void;
  /** When set, the liquid color interpolates across these stops based on sliderVal (0→100). Overrides `color`. */
  colorStops?: string[];
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "");
  if (m.length !== 6) return [153, 185, 198];
  return [
    parseInt(m.slice(0, 2), 16),
    parseInt(m.slice(2, 4), 16),
    parseInt(m.slice(4, 6), 16),
  ];
}
function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}
function hexToRgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function interpolateStops(stops: string[], t: number): string {
  if (stops.length === 0) return "#99B9C6";
  if (stops.length === 1) return stops[0];
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (stops.length - 1);
  const i = Math.floor(scaled);
  const f = scaled - i;
  if (i >= stops.length - 1) return stops[stops.length - 1];
  const [r1, g1, b1] = hexToRgb(stops[i]);
  const [r2, g2, b2] = hexToRgb(stops[i + 1]);
  return rgbToHex(r1 + (r2 - r1) * f, g1 + (g2 - g1) * f, b1 + (b2 - b1) * f);
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
}

const VIEWBOX_W = 220;
const VIEWBOX_H = 420;

const BODY_PATH =
  "M52 165 C52 138 72 118 99 118 H121 C148 118 168 138 168 165 V345 C168 378 148 398 115 398 H105 C72 398 52 378 52 345 V165 Z";

const LIQUID_BOTTOM = 398;
const LIQUID_TOP = 118;
const LIQUID_HEIGHT = LIQUID_BOTTOM - LIQUID_TOP;

/**
 * Mood Bottle — transparent glass vessel with natural proportions.
 * SVG-based body/neck/cap with thick neck, rounded shoulders and a collar.
 * Keeps idle breathing, mouse parallax, rising bubbles, wave surface and drag fill.
 *
 * The `size` prop now controls the rendered height (px); width is derived from
 * the 220×420 viewBox aspect ratio so the bottle never looks like a wide jar.
 */
export default function GlassVessel({
  size = 220,
  color = "#99B9C6",
  mode = "idle",
  glow = true,
  sliderVal,
  onSliderValChange,
  colorStops,
}: GlassVesselProps) {
  const isBrewing = mode === "mixing";
  const isThumb = mode === "thumb";

  const containerRef = useRef<HTMLDivElement>(null);
  const bottleBodyRef = useRef<SVGPathElement>(null);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [clickWaves, setClickWaves] = useState<Array<{ id: number }>>([]);
  const [internalVal, setInternalVal] = useState(60);

  const value = sliderVal ?? internalVal;
  const canDrag = !!onSliderValChange && !isBrewing && !isThumb;

  const activeColor =
    colorStops && colorStops.length > 0
      ? interpolateStops(colorStops, value / 100)
      : color;

  const colors = {
    main: activeColor,
    glow: hexToRgba(activeColor, 0.55),
    wave: hexToRgba(activeColor, 0.75),
  };

  // Seed bubbles once
  useEffect(() => {
    const count = isThumb ? 6 : 15;
    setParticles(
      Array.from({ length: count }).map((_, i) => ({
        id: i,
        x: 10 + Math.random() * 80,
        y: 5 + Math.random() * 90,
        size: 1.5 + Math.random() * 3,
        speed: 0.2 + Math.random() * 0.4,
        opacity: 0.1 + Math.random() * 0.3,
      })),
    );
  }, [isThumb]);

  // Bubble motion is CSS-driven (see .bubble in styles.css). No per-frame
  // setState here — that used to re-render the whole vessel every frame and
  // would restart the Framer Motion shake keyframes mid-cycle.


  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || isThumb) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const normX = (e.clientX - centerX) / (rect.width / 2);
    const normY = (e.clientY - centerY) / (rect.height / 2);
    setMousePos({
      x: Math.max(-1, Math.min(1, normX)),
      y: Math.max(-1, Math.min(1, normY)),
    });
  };

  const handleMouseEnter = () => {
    if (!isThumb) setIsHovered(true);
  };
  const handleMouseLeave = () => {
    if (!isDragging) {
      setIsHovered(false);
      setMousePos({ x: 0, y: 0 });
    }
  };

  const handleClick = () => {
    if (isDragging || isThumb) return;
    setIsClicked(true);
    const id = Date.now();
    setClickWaves((prev) => [...prev, { id }]);
    setTimeout(() => setIsClicked(false), 800);
    setTimeout(() => setClickWaves((prev) => prev.filter((w) => w.id !== id)), 1200);
  };

  const updateValueFromPointer = (clientY: number) => {
    if (!bottleBodyRef.current || !canDrag) return;
    const rect = bottleBodyRef.current.getBoundingClientRect();
    const relativeY = rect.bottom - clientY;
    const percentage = relativeY / rect.height;
    const clamped = Math.max(0, Math.min(1, percentage));
    const newVal = Math.round(clamped * 100);
    if (onSliderValChange) onSliderValChange(newVal);
    else setInternalVal(newVal);
  };

  const handlePointerDown = (e: React.PointerEvent<SVGPathElement>) => {
    if (!canDrag) return;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateValueFromPointer(e.clientY);
  };
  const handlePointerMove = (e: React.PointerEvent<SVGPathElement>) => {
    if (isDragging) updateValueFromPointer(e.clientY);
  };
  const handlePointerUp = (e: React.PointerEvent<SVGPathElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const width = size * (VIEWBOX_W / VIEWBOX_H);
  const liquidTop = LIQUID_BOTTOM - (value / 100) * LIQUID_HEIGHT;

  // Body vertical position in the rendered container for the drag guide.
  const bodyTopRatio = LIQUID_TOP / VIEWBOX_H;
  const bodyBottomRatio = LIQUID_BOTTOM / VIEWBOX_H;
  const bodyHeightPx = (bodyBottomRatio - bodyTopRatio) * size;
  const liquidRatio = (liquidTop - LIQUID_TOP) / LIQUID_HEIGHT;
  const guideBottomPx = (1 - liquidRatio) * bodyHeightPx;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className="relative flex items-center justify-center select-none"
      style={{
        width,
        height: size,
        cursor: canDrag ? "ns-resize" : "default",
      }}
      aria-hidden
    >
      {/* Ambient background glow */}
      {glow && (
        <motion.div
          className="absolute rounded-full blur-[70px] pointer-events-none z-0"
          style={{ width: size * 0.7, height: size * 0.7 }}
          animate={{
            backgroundColor: colors.main,
            scale: isBrewing ? 1.2 : isHovered ? (isClicked ? 1.25 : 1.15) : 1,
            opacity: isBrewing ? 0.5 : isHovered ? (isClicked ? 0.45 : 0.35) : 0.2,
          }}
          transition={{ type: "spring", stiffness: 70, damping: 20 }}
        />
      )}

      {/* Click ripples */}
      {clickWaves.map((wave) => (
        <motion.div
          key={wave.id}
          className="absolute rounded-full border pointer-events-none z-10"
          style={{
            borderColor: colors.main,
            boxShadow: `0 0 15px ${colors.glow}`,
          }}
          initial={{ width: width * 0.35, height: size * 0.45, opacity: 0.6, scale: 0.8 }}
          animate={{ width: width * 0.95, height: size * 0.85, opacity: 0, scale: 1.3 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      ))}

      {/* Bottle */}
      <motion.div
        className={isBrewing ? "relative z-20 mixing-bottle" : "relative z-20"}
        style={{ width, height: size, originY: 0.85 }}
        animate={
          isBrewing
            ? undefined
            : {
                y: isHovered ? mousePos.y * 3.5 : [0, -3.5, 0],
                x: isHovered ? mousePos.x * 3.5 : 0,
                rotate: isHovered ? mousePos.x * 2.8 : 0,
              }
        }
        transition={
          isBrewing
            ? undefined
            : isHovered
              ? { type: "spring", stiffness: 85, damping: 18 }
              : {
                  y: { repeat: Infinity, duration: 5, ease: "easeInOut" },
                  x: { duration: 0.5 },
                  rotate: { duration: 0.5 },
                }
        }
      >
        <svg
          viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
          className="w-full h-full"
          style={{ overflow: "visible" }}
        >
          <defs>
            <clipPath id="body-clip">
              <path d={BODY_PATH} />
            </clipPath>
            <radialGradient
              id="glass-body-gradient"
              cx="50%"
              cy="35%"
              r="65%"
              fx="50%"
              fy="30%"
            >
              <stop offset="0%" stopColor="rgba(255,255,255,0.045)" />
              <stop offset="60%" stopColor="rgba(255,255,255,0.015)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>


          {/* No sharp SVG ellipse glow — soft CSS radial gradient is applied
              by the parent component so the aura stays diffuse and frame-rate-friendly. */}

          {/* Cap / cork — wider than the neck */}
          <rect
            x="82"
            y="18"
            width="56"
            height="28"
            rx="8"
            fill="rgba(20,20,22,0.92)"
          />
          <rect
            x="84"
            y="45"
            width="52"
            height="10"
            rx="5"
            fill="rgba(255,190,60,0.85)"
          />

          {/* Neck — thick and proportionate */}
          <rect
            x="88"
            y="35"
            width="44"
            height="115"
            rx="14"
            fill="rgba(255,255,255,0.05)"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="3"
          />
          {/* Neck highlights */}
          <rect x="98" y="42" width="4" height="100" rx="2" fill="rgba(255,255,255,0.16)" />
          <rect x="118" y="42" width="4" height="100" rx="2" fill="rgba(255,255,255,0.08)" />

          {/* Collar / shoulder ring */}
          <rect
            x="78"
            y="140"
            width="64"
            height="14"
            rx="7"
            fill="rgba(255,255,255,0.18)"
          />

          {/* Body path with rounded shoulders */}
          <path
            ref={bottleBodyRef}
            d={BODY_PATH}
            fill="transparent"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="3"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ touchAction: canDrag ? "none" : "auto", cursor: canDrag ? "ns-resize" : "default" }}
          />

          {/* Subtle glass body volume — soft gradient, no hard oval sticker */}
          <path
            d={BODY_PATH}
            fill="url(#glass-body-gradient)"
            stroke="none"
            style={{ mixBlendMode: "overlay" }}
          />


          {/* Liquid + bubbles + waves, clipped to the body */}
          <g clipPath="url(#body-clip)">
            <rect
              x="0"
              y={liquidTop}
              width="220"
              height={VIEWBOX_H - liquidTop}
              fill={colors.wave}
              opacity="0.78"
            />

            {/* Primary wave */}
            <svg
              x="0"
              y={liquidTop - 12}
              width="220"
              height="24"
              viewBox="0 0 1200 120"
              preserveAspectRatio="none"
              style={{ color: colors.main }}
            >
              <path
                className="liquid-wave-1"
                style={{ animationDuration: isBrewing ? "1.5s" : "4.5s" }}
                d="M0,60 C150,90 350,30 500,60 C650,90 850,30 1000,60 C1150,90 1350,30 1500,60 L1500,120 L0,120 Z"
                fill="currentColor"
              />
            </svg>

            {/* Secondary wave */}
            <svg
              x="0"
              y={liquidTop - 14}
              width="220"
              height="28"
              viewBox="0 0 1200 120"
              preserveAspectRatio="none"
              style={{ color: colors.wave }}
            >
              <path
                className="liquid-wave-2"
                style={{ animationDuration: isBrewing ? "1s" : "3.5s" }}
                d="M0,50 C150,20 350,80 500,50 C650,20 850,80 1000,50 C1150,20 1350,80 1500,50 L1500,120 L0,120 Z"
                fill="currentColor"
              />
            </svg>

            {/* Bubbles */}
            {particles.map((p) => {
              const driftX = isHovered ? mousePos.x * 10 : 0;
              return (
                <motion.circle
                  key={p.id}
                  cx={`${p.x}%`}
                  cy={`${p.y}%`}
                  r={p.size}
                  fill={colors.glow}
                  opacity={p.opacity + (isClicked || isBrewing ? 0.3 : 0)}
                  animate={{ x: driftX }}
                  transition={{ type: "spring", stiffness: 40, damping: 15 }}
                />
              );
            })}
          </g>

          {/* Body highlights with mouse parallax */}
          <motion.path
            d="M68 178 V340"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="5"
            strokeLinecap="round"
            animate={{ x: isHovered ? mousePos.x * -2 : 0 }}
            transition={{ type: "spring", stiffness: 90, damping: 20 }}
          />
          <motion.path
            d="M154 178 V340"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="4"
            strokeLinecap="round"
            animate={{ x: isHovered ? mousePos.x * -1.2 : 0 }}
            transition={{ type: "spring", stiffness: 90, damping: 20 }}
          />
        </svg>

        {/* Drag guide — positioned over the body */}
        {canDrag && isHovered && (
          <div
            className="absolute left-0 right-0 border-t border-dashed border-white/30 pointer-events-none z-30 flex items-center justify-between px-1.5"
            style={{
              bottom: `${guideBottomPx}px`,
              transition: isDragging ? "none" : "bottom 0.1s ease-out",
            }}
          >
            <span className="text-[6px] font-mono text-white/50 bg-black/60 px-1 rounded py-[1px]">
              DRAG
            </span>
            <span className="text-[6px] font-mono text-amber-400/90 bg-black/60 px-1 rounded py-[1px]">
              {value}%
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
