import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { FLAVOR_CHIPS, MOOD_PLACEHOLDERS_EN } from "../../lib/moodtail-data.js";
import { VIBE_PICKS } from "../../lib/vibe-picks.js";
import type { SensoryState } from "../../lib/vibeflow.js";
import { BASE_SPIRITS, type AlcoholLevel } from "../../lib/mix-flow.js";

import Draw from "../draw/art.js";
import PourCup from "../draw/PourCup.js";

/* ── Shared chrome ──────────────────────────────────────────────────── */

export function StepHeader({
  index,
  total,
  title,
  sub,
}: {
  index: number;
  total: number;
  title: string;
  sub: string;
}) {
  return (
    <header className="mb-8">
      <div className="mb-4 flex items-center gap-4">
        <span className="eyebrow-gilt">
          {"№ "}
          {String(index + 1).padStart(2, "0")}
          <span style={{ color: "var(--ink-faint)" }}>
            {" / "}
            {String(total).padStart(2, "0")}
          </span>
        </span>
        <span
          className="h-px w-24"
          aria-hidden
          style={{
            background: "linear-gradient(90deg, var(--gold-line-strong) 0%, transparent 100%)",
          }}
        />
      </div>
      <h1 className="hand text-[clamp(38px,6vw,64px)]">{title}</h1>
      <p className="note mt-3 max-w-xl text-[18px]">{sub}</p>
    </header>
  );
}

/**
 * One drawn end of a PoleSlider. Lives at module scope so its identity is
 * stable across renders — defined inline it would force React to unmount and
 * remount the filtered sketch on every slider input event.
 */
function Pole({
  art,
  label,
  hint,
  active,
  onPick,
  align,
}: {
  art: string;
  label: string;
  hint: string;
  active: boolean;
  onPick: () => void;
  align: "start" | "end";
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex w-[104px] shrink-0 flex-col gap-1.5"
      style={{
        alignItems: align === "start" ? "flex-start" : "flex-end",
        textAlign: align === "start" ? "left" : "right",
      }}
    >
      <span
        style={{
          width: 64,
          color: active ? "var(--ink)" : "var(--ink-soft)",
          opacity: active ? 1 : 0.7,
          transform: active ? "rotate(-2deg) scale(1.08)" : "none",
          transition: "opacity 200ms ease, transform 200ms ease, color 200ms ease",
        }}
      >
        <Draw name={art} strokeWidth={2.8} />
      </span>
      <span
        className="hand text-[24px] leading-none"
        style={{ color: active ? "var(--ink)" : "var(--ink-faint)" }}
      >
        {label}
      </span>
      <span className="note text-[13px] leading-tight" style={{ color: "var(--ink-mute)" }}>
        {hint}
      </span>
    </button>
  );
}

/**
 * A slider that explains itself: the two ends are drawn, not named with words
 * like "crisp" that only mean something if you already drink cocktails.
 */
function PoleSlider({
  value,
  onChange,
  left,
  right,
  leftArt,
  rightArt,
  leftHint,
  rightHint,
}: {
  value: number;
  onChange: (v: number) => void;
  left: string;
  right: string;
  leftArt: string;
  rightArt: string;
  leftHint: string;
  rightHint: string;
}) {
  const leaning = value < 42 ? "left" : value > 58 ? "right" : "mid";

  return (
    <div className="flex items-start gap-3 sm:gap-5">
      <Pole
        art={leftArt}
        label={left}
        hint={leftHint}
        active={leaning === "left"}
        onPick={() => onChange(12)}
        align="start"
      />

      <div className="relative min-w-0 flex-1 self-center pt-1">
        <div className="slider-track-drawn" />
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="slider-ink relative"
          aria-label={`${left} to ${right}`}
        />
        <span
          className="note absolute left-1/2 top-full -translate-x-1/2 whitespace-nowrap pt-1 text-[13px]"
          style={{ color: "var(--ink-faint)" }}
        >
          {leaning === "mid" ? "—" : ""}
        </span>
      </div>

      <Pole
        art={rightArt}
        label={right}
        hint={rightHint}
        active={leaning === "right"}
        onPick={() => onChange(88)}
        align="end"
      />
    </div>
  );
}

/* ── 01 · Vibe ──────────────────────────────────────────────────────── */

export function StepVibe({
  moodText,
  pickedLabel,
  onPick,
  onText,
  onDiy,
}: {
  moodText: string;
  pickedLabel: string | null;
  onPick: (key: string) => void;
  onText: (text: string) => void;
  onDiy: () => void;
}) {
  const boxRef = useRef<HTMLTextAreaElement>(null);
  // The box opens only when the guest asks for it (or arrived with typed text).
  const [diyOpen, setDiyOpen] = useState(() => !!moodText.trim() && !pickedLabel);
  const placeholders = MOOD_PLACEHOLDERS_EN;
  const shuffle = () => onText(placeholders[Math.floor(Math.random() * placeholders.length)]!);

  const pickPlate = (key: string) => {
    setDiyOpen(false);
    onPick(key);
  };

  const openDiy = () => {
    onDiy();
    setDiyOpen(true);
    setTimeout(() => boxRef.current?.focus(), 60);
  };

  const diySelected = diyOpen && !pickedLabel;

  return (
    <div>
      <div className="mb-4">
        <span className="scrawl">{"Which one is tonight?"}</span>
      </div>

      {/* All the plates on the table at once — four to a row.
          Writing it yourself is just one more plate. */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-14 sm:grid-cols-3 lg:grid-cols-4">
        <button
          type="button"
          onClick={openDiy}
          className="plate"
          data-selected={diySelected}
        >
          <span className="plate-art" style={{ height: 52 }}>
            <Draw name="pen" strokeWidth={2.6} style={{ width: "48%" }} />
          </span>
          <span className="plate-rule mt-4" />
          <span className="mt-3 flex items-baseline gap-2">
            <span className="specimen-no">00</span>
            <span className="plate-label note text-[14px] leading-tight">
              {"Write it yourself"}
            </span>
          </span>
        </button>

        {VIBE_PICKS.map((v, i) => {
          const selected = pickedLabel === v.key;
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => pickPlate(v.key)}
              className="plate"
              data-selected={selected}
            >
              <span className="plate-art" style={{ height: 52 }}>
                <Draw name={v.art} strokeWidth={2.6} style={{ width: "48%" }} />
              </span>
              <span className="plate-rule mt-4" />
              <span className="mt-3 flex items-baseline gap-2">
                <span className="specimen-no">{String(i + 1).padStart(2, "0")}</span>
                <span className="plate-label note text-[14px] leading-tight">{v.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* The box, revealed only when "Write it yourself" is on the table */}
      <AnimatePresence initial={false}>
        {diySelected && (
          <motion.div
            key="diy"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="mt-8">
              <div className="scrawl mb-1">{"In your own words"}</div>
              <div className="relative">
                <textarea
                  ref={boxRef}
                  value={moodText}
                  onChange={(e) => onText(e.target.value)}
                  rows={3}
                  placeholder={placeholders[0]}
                  className="field resize-none pr-28 text-[24px] leading-snug"
                  style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}
                />
                <button
                  type="button"
                  onClick={shuffle}
                  className="btn btn-outline absolute bottom-2 right-0 !px-3 !py-1 !text-[15px]"
                >
                  {"Shuffle"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── 02 · Taste ─────────────────────────────────────────────────────── */

export function StepTaste({
  sensory,
  onChange,
  summary,
}: {
  sensory: SensoryState;
  onChange: (key: keyof SensoryState, v: number) => void;
  summary: string;
}) {
  return (
    <div>
      <div className="space-y-9">
        <PoleSlider
          value={sensory.fresh}
          onChange={(v) => onChange("fresh", v)}
          left={"Bright"}
          right={"Deep"}
          leftArt="lemon"
          rightArt="barrel"
          leftHint={"citrus, ice, wakes you up"}
          rightHint={"oak, caramel, sits heavier"}
        />
        <PoleSlider
          value={sensory.soft}
          onChange={(v) => onChange("soft", v)}
          left={"Gentle"}
          right={"Punchy"}
          leftArt="feather"
          rightArt="chili"
          leftHint={"smooth, no bite"}
          rightHint={"spice, bitterness, a jolt"}
        />
        <PoleSlider
          value={sensory.familiar}
          onChange={(v) => onChange("familiar", v)}
          left={"Familiar"}
          right={"Surprise me"}
          leftArt="home"
          rightArt="dice"
          leftHint={"the one you always order"}
          rightHint={"never had it, roll the dice"}
        />
      </div>

      <p className="note mt-10 border-t pt-5 text-[21px]" style={{ borderColor: "var(--line)" }}>
        {summary}
      </p>
    </div>
  );
}

/* ── 03 · Strength ──────────────────────────────────────────────────── */

export function StepStrength({
  alcohol,
  onAlcohol,
  strength,
  onStrength,
}: {
  alcohol: AlcoholLevel;
  onAlcohol: (v: AlcoholLevel) => void;
  strength: number;
  onStrength: (v: number) => void;
}) {
  return (
    <div>
      <div className="scrawl mb-4">{"Tap the glass — pour it as high as you like"}</div>

      <PourCup value={alcohol} onChange={onAlcohol} />

      <div className="mt-10 border-t pt-8" style={{ borderColor: "var(--line)" }}>
        <div className="scrawl mb-5">{"How long are we here?"}</div>
        <PoleSlider
          value={strength}
          onChange={onStrength}
          left={"All evening"}
          right={"One and done"}
          leftArt="couch"
          rightArt="fire"
          leftHint={"tall glass, ice, keeps going"}
          rightHint={"small glass, concentrated, hits"}
        />
      </div>
    </div>
  );
}

/* ── 04 · Spirit ────────────────────────────────────────────────────── */

export function StepSpirit({
  baseSpirit,
  onPick,
  availableKeys,
}: {
  baseSpirit: string;
  onPick: (key: string) => void;
  availableKeys?: string[];
}) {
  const options =
    availableKeys === undefined
      ? BASE_SPIRITS
      : BASE_SPIRITS.filter((s) => availableKeys.includes(s.key));

  return (
    <div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {/* No preference sits on the shelf like everything else */}
        <button
          type="button"
          className="plate"
          data-selected={baseSpirit === ""}
          onClick={() => onPick("")}
        >
          <span className="plate-art" style={{ height: 84 }}>
            <Draw name="dice" strokeWidth={2.6} style={{ width: 62 }} />
          </span>
          <span className="plate-rule mt-3" />
          <span className="plate-label note mt-2.5 block text-[15px] leading-tight">
            {"No preference"}
          </span>
          <span className="scrawl-sm mt-1 block leading-tight">{"You pick for me"}</span>
        </button>
        {options.map((sp) => {
          const selected = baseSpirit === sp.key;
          return (
            <button
              key={sp.key}
              type="button"
              className="plate"
              data-selected={selected}
              onClick={() => onPick(sp.key)}
            >
              <span className="plate-art" style={{ height: 84 }}>
                <Draw name={sp.key} strokeWidth={2.8} style={{ width: 70 }} />
              </span>
              <span className="plate-rule mt-3" />
              <span className="plate-label note mt-2.5 block text-[15px] leading-tight">
                {sp.en}
              </span>
              <span className="scrawl-sm mt-1 block leading-tight">{sp.noteEn}</span>
            </button>
          );
        })}
      </div>

      {options.length === 0 && (
        <p className="note mt-4">{"No base spirits listed on this menu."}</p>
      )}
    </div>
  );
}

/* ── 05 · Notes ─────────────────────────────────────────────────────── */

export function StepNotes({
  manualFlavors,
  onToggleFlavor,
  referenceDrink,
  onReference,
}: {
  manualFlavors: string[];
  onToggleFlavor: (label: string) => void;
  referenceDrink: string;
  onReference: (v: string) => void;
}) {
  return (
    <div>
      <div className="scrawl mb-3">
        {"Anything specific · up to 3"}
        {manualFlavors.length > 0 && ` · ${manualFlavors.length}/3`}
      </div>
      <div className="flex flex-wrap gap-2">
        {FLAVOR_CHIPS.map((c) => {
          const selected = manualFlavors.includes(c.label);
          return (
            <button
              key={c.label}
              type="button"
              className="chip"
              data-selected={selected}
              onClick={() => onToggleFlavor(c.label)}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <div className="mt-10 border-t pt-8" style={{ borderColor: "var(--line)" }}>
        <div className="scrawl mb-1">{"Already got one in mind?"}</div>
        <input
          type="text"
          value={referenceDrink}
          onChange={(e) => onReference(e.target.value)}
          placeholder={"e.g. like a Mojito, but less sweet"}
          className="field text-[24px]"
          style={{ fontFamily: "var(--font-display)", fontWeight: 400 }}
        />
      </div>
    </div>
  );
}

/** Guard used by the container when toggling flavors. */
export function limitFlavors(prev: string[], label: string): string[] {
  if (prev.includes(label)) return prev.filter((f) => f !== label);
  if (prev.length >= 3) {
    return prev;
  }
  return [...prev, label];
}
