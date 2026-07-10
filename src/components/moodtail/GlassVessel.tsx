"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface GlassVesselProps {
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

/**
 * Mood Bottle — transparent glass vessel with:
 *  - idle breathing float
 *  - pointer-driven magnetic tilt / parallax reflections
 *  - rising micro-bubbles inside the liquid
 *  - optional vertical drag to control fill (when onSliderValChange is set)
 *  - optional palette interpolation across drag range (colorStops)
 *  - `mixing` mode drives brewing waves + shake
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
  const bottleBodyRef = useRef<HTMLDivElement>(null);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [clickWaves, setClickWaves] = useState<Array<{ id: number }>>([]);
  const [internalVal, setInternalVal] = useState(60);

  const value = sliderVal ?? internalVal;
  const canDrag = !!onSliderValChange && !isBrewing && !isThumb;

  const colors = {
    main: color,
    glow: hexToRgba(color, 0.55),
    wave: hexToRgba(color, 0.75),
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

  // Bubble rise loop
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setParticles((prev) =>
        prev.map((p) => {
          let newY = p.y - p.speed * (isBrewing ? 2.2 : 1);
          if (newY < -5) newY = 105;
          return { ...p, y: newY };
        }),
      );
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isBrewing]);

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

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canDrag) return;
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updateValueFromPointer(e.clientY);
  };
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) updateValueFromPointer(e.clientY);
  };
  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Layout scaling: original design is 280×320. Scale everything with size.
  const scale = size / 280;
  const px = (n: number) => `${n * scale}px`;
  const liquidHeight = 22 + value * 0.6;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className="relative flex items-center justify-center select-none"
      style={{
        width: size,
        height: size * (320 / 280),
        cursor: canDrag ? "ns-resize" : "default",
      }}
      aria-hidden
    >
      {/* Ambient background glow */}
      {glow && (
        <motion.div
          className="absolute rounded-full blur-[70px] pointer-events-none z-0"
          style={{ width: px(210), height: px(210) }}
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
          initial={{ width: px(90), height: px(180), opacity: 0.6, scale: 0.8 }}
          animate={{ width: px(220), height: px(340), opacity: 0, scale: 1.3 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      ))}

      {/* Bottle */}
      <motion.div
        className="relative flex flex-col items-center justify-end z-20"
        style={{ originY: 0.85 }}
        animate={
          isBrewing
            ? { rotate: [-6, 6, -6], y: [0, -2, 0] }
            : {
                y: isHovered ? mousePos.y * 3.5 : [0, -3.5, 0],
                x: isHovered ? mousePos.x * 3.5 : 0,
                rotate: isHovered ? mousePos.x * 2.8 : 0,
              }
        }
        transition={
          isBrewing
            ? { duration: 1.05, repeat: Infinity, ease: "easeInOut" }
            : isHovered
              ? { type: "spring", stiffness: 85, damping: 18 }
              : {
                  y: { repeat: Infinity, duration: 5, ease: "easeInOut" },
                  x: { duration: 0.5 },
                  rotate: { duration: 0.5 },
                }
        }
      >
        {/* Wax foil cap */}
        <div
          className="relative flex flex-col items-center select-none pointer-events-none"
          style={{ width: px(18), height: px(26) }}
        >
          <div style={{ width: px(14), height: px(4) }} className="bg-[#1a1c1e] rounded-t-sm" />
          <div
            style={{ width: px(14), height: px(18) }}
            className="bg-gradient-to-b from-[#25282f] to-[#141518] border-x border-white/5 relative shadow-inner"
          >
            <div
              className="absolute inset-x-0 bg-gradient-to-r from-amber-400/80 via-amber-200/95 to-amber-500/80"
              style={{ bottom: px(2), height: px(2.5) }}
            />
          </div>
          <div
            style={{ width: px(18), height: px(4) }}
            className="bg-white/20 border-b border-white/10 rounded-full"
          />
        </div>

        {/* Neck */}
        <div
          className="relative bg-white/[0.04] border-x border-white/15"
          style={{ width: px(14), height: px(52) }}
        >
          <div className="absolute inset-y-0 bg-white/20" style={{ left: px(2.5), width: 1 }} />
          <div className="absolute inset-y-0 bg-white/10" style={{ right: px(2.5), width: 1 }} />
          <div
            className="absolute inset-x-[1px] bg-amber-900/30 blur-[0.5px] rounded-b-sm"
            style={{ top: 0, height: px(14) }}
          />
        </div>

        {/* Sloping shoulders */}
        <div
          className="bg-white/[0.04] border-x border-t border-white/15 rounded-t-[32px] relative overflow-hidden"
          style={{ width: px(92), height: px(28) }}
        >
          <div
            className="absolute inset-x-4 bg-white/20 blur-[0.5px]"
            style={{ top: px(2), height: 1 }}
          />
        </div>

        {/* Body (draggable) */}
        <div
          ref={bottleBodyRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative rounded-b-[14px] border-x border-b border-white/15 bg-white/[0.03] backdrop-blur-xl overflow-hidden flex flex-col justify-end select-none"
          style={{
            width: px(92),
            height: px(190),
            touchAction: canDrag ? "none" : "auto",
            cursor: canDrag ? "ns-resize" : "default",
            boxShadow: isHovered
              ? `inset 0 4px 30px rgba(255,255,255,0.05), 0 0 25px ${colors.glow}, 0 18px 40px rgba(0,0,0,0.65)`
              : `inset 0 4px 30px rgba(255,255,255,0.03), 0 18px 40px rgba(0,0,0,0.65)`,
          }}
        >
          {/* Reflections */}
          <motion.div
            className="absolute top-0 bottom-0 bg-white/15 rounded-full pointer-events-none z-30"
            style={{ left: px(5), width: px(2.5) }}
            animate={{
              x: isHovered ? mousePos.x * -2 : 0,
              opacity: isHovered ? 0.35 : 0.18,
            }}
            transition={{ type: "spring", stiffness: 90, damping: 20 }}
          />
          <motion.div
            className="absolute top-0 bottom-0 bg-white/10 rounded-full pointer-events-none z-30"
            style={{ right: px(6), width: 1 }}
            animate={{ x: isHovered ? mousePos.x * -1.2 : 0 }}
            transition={{ type: "spring", stiffness: 90, damping: 20 }}
          />

          {/* Drag guide */}
          {canDrag && isHovered && (
            <div
              className="absolute left-0 right-0 border-t border-dashed border-white/30 pointer-events-none z-30 flex items-center justify-between px-1.5"
              style={{
                bottom: `${liquidHeight}%`,
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

          {/* Liquid */}
          <motion.div
            className="w-full relative overflow-hidden rounded-b-[12px] pointer-events-none"
            style={{ zIndex: 15 }}
            animate={{ height: `${liquidHeight}%` }}
            transition={
              isDragging
                ? { duration: 0.05 }
                : { type: "spring", stiffness: 45, damping: 15 }
            }
          >
            <svg
              className="absolute left-0 w-[200%] fill-current pointer-events-none"
              style={{
                color: colors.main,
                height: 24,
                top: -10,
                transform: isHovered ? `translateX(${mousePos.x * -7}px)` : "none",
              }}
              viewBox="0 0 1200 120"
              preserveAspectRatio="none"
            >
              <path
                className="liquid-wave-1"
                style={{ animationDuration: isBrewing ? "1.5s" : "4.5s" }}
                d="M0,60 C150,90 350,30 500,60 C650,90 850,30 1000,60 C1150,90 1350,30 1500,60 L1500,120 L0,120 Z"
              />
            </svg>
            <svg
              className="absolute left-0 w-[200%] fill-current pointer-events-none"
              style={{
                color: colors.wave,
                height: 28,
                top: -13,
                transform: isHovered ? `translateX(${mousePos.x * -14}px)` : "none",
              }}
              viewBox="0 0 1200 120"
              preserveAspectRatio="none"
            >
              <path
                className="liquid-wave-2"
                style={{ animationDuration: isBrewing ? "1s" : "3.5s" }}
                d="M0,50 C150,20 350,80 500,50 C650,20 850,80 1000,50 C1150,20 1350,80 1500,50 L1500,120 L0,120 Z"
              />
            </svg>

            <div
              className="w-full h-full relative transition-colors duration-1000"
              style={{ backgroundColor: colors.wave }}
            >
              {particles.map((p) => {
                const driftX = isHovered ? mousePos.x * 10 : 0;
                return (
                  <motion.div
                    key={p.id}
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      width: p.size,
                      height: p.size,
                      backgroundColor: colors.glow,
                      opacity: p.opacity + (isClicked || isBrewing ? 0.3 : 0),
                    }}
                    animate={{ x: driftX }}
                    transition={{ type: "spring", stiffness: 40, damping: 15 }}
                  />
                );
              })}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
