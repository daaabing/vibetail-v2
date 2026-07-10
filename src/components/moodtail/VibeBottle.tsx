"use client";

import GlassVessel from "./GlassVessel";

export type VibeBottleMode = "idle" | "mixing";

interface VibeBottleProps {
  color?: string;
  size?: number;
  mode?: VibeBottleMode;
  glow?: boolean;
  sliderVal?: number;
  onSliderValChange?: (val: number) => void;
  colorStops?: string[];
}

/** Backwards-compat wrapper. All existing call sites keep working. */
export default function VibeBottle({
  color = "#99B9C6",
  size = 220,
  mode = "idle",
  glow = true,
  sliderVal,
  onSliderValChange,
  colorStops,
}: VibeBottleProps) {
  return (
    <GlassVessel
      size={size}
      color={color}
      mode={mode}
      glow={glow}
      sliderVal={sliderVal}
      onSliderValChange={onSliderValChange}
      colorStops={colorStops}
    />
  );
}
