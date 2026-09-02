import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { venuePreferencesSchema, type VenueMenuItem, type VenuePreferences } from "@vibetail/contracts";

import DrinkStage from "../../draw/DrinkStage.js";
import OrderPanel from "../../mix/OrderPanel.js";
import {
  StepHeader,
  StepNotes,
  StepSpirit,
  StepStrength,
  StepTaste,
  StepVibe,
  limitFlavors,
} from "../../mix/steps.js";
import { findVibePick } from "../../../lib/vibe-picks.js";
import { MOOD_PLACEHOLDERS_EN } from "../../../lib/moodtail-data.js";
import {
  DEFAULT_SENSORY,
  sensorySummary,
  type SensoryState,
} from "../../../lib/vibeflow.js";
import {
  BASE_SPIRITS,
  STEP_IDS,
  STEP_TITLES,
  type AlcoholLevel,
  type MixOrder,
  type StepId,
  buildPreference,
  deriveMenuBaseSpiritKeys,
} from "../../../lib/mix-flow.js";

/** Longest gap between two taps still read as one double-tap. */
const DOUBLE_TAP_MS = 320;

const STEP_SUBS: Record<StepId, string> = {
  vibe: "Pick the one that fits tonight. This is the only answer we actually need.",
  taste:
    "Three sliders, by instinct. No cocktail vocabulary required — leave them centred and we'll judge for you.",
  strength: "How hard should tonight hit, and how long should it last?",
  spirit: "Optional. Most people skip this and let the drink decide its own base.",
  notes: "Last call for specifics. Anything here overrides what we inferred.",
};

interface PreferenceFormProps {
  busy: boolean;
  initial?: VenuePreferences;
  /** When present, the base-spirit shelf only shows what this menu pours. */
  menuItems?: VenueMenuItem[];
  onSubmit(preferences: VenuePreferences): void;
}

/**
 * The split-screen drink builder from ui-polish. Left: a live charcoal
 * drawing of the drink assembling itself as the guest answers. Right: five
 * questions on paper. Emits the platform's VenuePreferences contract.
 */
export function PreferenceForm({ busy, initial, menuItems, onSubmit }: PreferenceFormProps) {
  const availableSpiritKeys = useMemo(
    () => (menuItems ? deriveMenuBaseSpiritKeys(menuItems) : undefined),
    [menuItems],
  );

  /* ── Step navigation ── */
  const [step, setStepState] = useState(0);
  // The primary button changes identity on the last step — "Continue" becomes
  // "Meet my drink" — so a double-tap landing either side of that change fires
  // a match the guest never asked for. Remember when the step last moved and
  // let submit() ignore anything arriving within one double-tap of it.
  const stepMovedAtRef = useRef(Number.NEGATIVE_INFINITY);
  const setStep = (n: number) => {
    const next = Math.min(STEP_IDS.length - 1, Math.max(0, n));
    if (next === step) return;
    stepMovedAtRef.current = performance.now();
    setStepState(next);
    // "instant" beats the global `html { scroll-behavior: smooth }` rule; a
    // multi-hundred-ms animated scroll under the sticky header would run
    // concurrently with the step transition on every click.
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const stepId = STEP_IDS[step]!;

  /* ── The order ── */
  const [pickedLabel, setPickedLabel] = useState<string | null>(null);
  const [moodText, setMoodText] = useState(initial?.mood ?? "");
  const [sensory, setSensory] = useState<SensoryState>(DEFAULT_SENSORY);
  const [alcohol, setAlcohol] = useState<AlcoholLevel>(
    initial?.alcoholPreference === "non_alcoholic" ? "zero" : initial?.alcoholPreference === "alcoholic" ? "strong" : "standard",
  );
  const [baseSpirit, setBaseSpirit] = useState("");
  const [manualFlavors, setManualFlavors] = useState<string[]>(initial?.flavors ?? []);
  const [referenceDrink, setReferenceDrink] = useState("");
  const [showOrder, setShowOrder] = useState(false);
  const [error, setError] = useState("");
  const touchedRef = useRef(Boolean(initial?.mood));

  const order: MixOrder = { moodText, pickedLabel, sensory, alcohol, baseSpirit, manualFlavors, referenceDrink };
  const hasVibe = moodText.trim().length > 0 || !!pickedLabel;

  // Never let the first screen be blank.
  useEffect(() => {
    if (touchedRef.current || pickedLabel || moodText) return;
    setMoodText(MOOD_PLACEHOLDERS_EN[Math.floor(Math.random() * MOOD_PLACEHOLDERS_EN.length)]!);
  }, [pickedLabel, moodText]);

  /* ── Handlers ── */
  const pickVibe = (key: string) => {
    touchedRef.current = true;
    setError("");
    if (pickedLabel === key) { setPickedLabel(null); return; }
    const pick = findVibePick(key);
    setPickedLabel(key);
    if (pick) setMoodText(pick.mood);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { (navigator as Navigator & { vibrate?: (p: number) => void }).vibrate?.(8); } catch { /* ignore */ }
    }
  };
  const writeMood = (text: string) => {
    touchedRef.current = true;
    setError("");
    setMoodText(text);
    if (text.trim()) setPickedLabel(null);
  };
  const startDiy = () => { touchedRef.current = true; setPickedLabel(null); };
  const changeSensory = (key: keyof SensoryState, v: number) => setSensory((s) => ({ ...s, [key]: v }));

  const submit = () => {
    // advance() routes the last step here rather than through setStep, so
    // without this guard a double-tap on Continue at the 04 → 05 boundary
    // lands on "Meet my drink" and submits a step early.
    if (performance.now() - stepMovedAtRef.current < DOUBLE_TAP_MS) return;
    if (!hasVibe) { setError("Choose a mood or write your own line."); setStep(0); return; }
    const { finalFlavors, customPreference } = buildPreference(order, "en");
    const mood = moodText.trim() || findVibePick(pickedLabel)?.mood || "";
    const parsed = venuePreferencesSchema.safeParse({
      ...(mood ? { mood } : {}),
      flavors: finalFlavors,
      alcoholPreference: alcohol === "zero" ? "non_alcoholic" : alcohol === "standard" ? "either" : "alcoholic",
      excludedAllergens: initial?.excludedAllergens ?? [],
      excludedIngredients: initial?.excludedIngredients ?? [],
      ...(customPreference ? { freeText: customPreference.slice(0, 500) } : {}),
    });
    if (!parsed.success) { setError("Tell us a mood or choose at least one flavour."); return; }
    setError("");
    onSubmit(parsed.data);
  };

  const isLast = step === STEP_IDS.length - 1;
  const primaryLabel = isLast ? "Meet my drink" : "Continue";
  const advance = () => (isLast ? submit() : setStep(step + 1));

  const stepBody = (() => {
    switch (stepId) {
      case "vibe":
        return <StepVibe moodText={moodText} pickedLabel={pickedLabel} onPick={pickVibe} onText={writeMood} onDiy={startDiy} />;
      case "taste":
        return <StepTaste sensory={sensory} onChange={changeSensory} summary={sensorySummary("en", sensory)} />;
      case "strength":
        return <StepStrength alcohol={alcohol} onAlcohol={setAlcohol} strength={sensory.strength} onStrength={(v) => changeSensory("strength", v)} />;
      case "spirit":
        return <StepSpirit baseSpirit={baseSpirit} onPick={setBaseSpirit} {...(availableSpiritKeys ? { availableKeys: availableSpiritKeys } : {})} />;
      case "notes":
        return <StepNotes manualFlavors={manualFlavors} onToggleFlavor={(l) => setManualFlavors((p) => limitFlavors(p, l))} referenceDrink={referenceDrink} onReference={setReferenceDrink} />;
    }
  })();

  const spiritName = BASE_SPIRITS.find((s) => s.key === baseSpirit);

  return (
    <div className="noir builder" style={{ background: "var(--paper)" }}>
      <div className="flex min-h-svh flex-col lg:grid lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)]">
        {/* ── Left — the drink, building itself ── */}
        <aside className="relative h-[36svh] min-h-[280px] lg:sticky lg:top-0 lg:h-svh lg:min-h-0" style={{ borderRight: "1px solid var(--line)" }}>
          <DrinkStage order={order} hasVibe={hasVibe} step={step} />
        </aside>

        {/* ── Right — the questions, on paper ── */}
        <div className="paper-pocket relative flex min-w-0 flex-col" style={{ background: "var(--paper)" }}>
          <div className="sticky top-0 z-30" style={{ background: "var(--paper)", borderBottom: "1px solid var(--line)" }}>
            <div className="flex items-center justify-between gap-4 px-[clamp(20px,4vw,64px)] py-3.5">
              {step === 0 ? (
                <a href="/" className="mono flex items-center gap-2" style={{ color: "inherit", textDecoration: "none" }}>
                  <span aria-hidden>←</span>
                  Exit
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="mono flex items-center gap-2"
                  style={{ color: "inherit", background: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit" }}
                >
                  <span aria-hidden>←</span>
                  Back
                </button>
              )}
              <div className="flex flex-1 items-center gap-1.5 px-2" aria-hidden>
                {STEP_IDS.map((id, i) => (
                  <span key={id} className="h-[2px] flex-1 transition-colors" style={{ background: i < step ? "var(--ink-mute)" : i === step ? "var(--ink)" : "var(--line)" }} />
                ))}
              </div>
              <span className="mono-sm hidden sm:inline" style={{ color: "var(--ink)" }}>
                {String(step + 1).padStart(2, "0")}
                <span style={{ color: "var(--ink-faint)" }}>/{String(STEP_IDS.length).padStart(2, "0")}</span>
              </span>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center px-[clamp(20px,4vw,64px)] pb-40 pt-10 lg:pb-16">
            {/* No exit animation: the old step's DOM (17 filtered sketches on
                step one) must leave in a single cheap frame, not spend 240ms
                animating on the way out while the next step rasterises. */}
            <motion.section key={stepId} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}>
              <StepHeader index={step} total={STEP_IDS.length} title={STEP_TITLES[stepId].en} sub={STEP_SUBS[stepId]} />
              {stepBody}
            </motion.section>

            {error && <p className="vt-form-error" role="alert">{error}</p>}

            <div className="mt-12 hidden items-center gap-3 lg:flex">
              {step > 0 && <button type="button" className="btn btn-outline" onClick={() => setStep(step - 1)}>Back</button>}
              <button type="button" className="btn btn-solid" data-testid="match-button" disabled={!hasVibe || busy} onClick={advance}>
                {primaryLabel}<span aria-hidden>→</span>
              </button>
              {!isLast && (
                <button type="button" className="mono-sm underline underline-offset-4" onClick={submit} disabled={!hasVibe || busy}>
                  Skip the rest, just mix it
                </button>
              )}
            </div>
          </div>

          {/* ── Mobile bottom bar ── */}
          <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden" style={{ background: "var(--paper)", borderTop: "1px solid var(--line-strong)", paddingBottom: "env(safe-area-inset-bottom)" }}>
            <button type="button" onClick={() => setShowOrder((s) => !s)} className="mono flex w-full items-center justify-between px-5 py-2.5" style={{ borderBottom: showOrder ? "1px solid var(--line)" : undefined }}>
              <span>The order</span>
              <span className="flex items-center gap-2">
                <span className="mono-sm truncate" style={{ maxWidth: 150, color: "var(--ink)" }}>{spiritName ? spiritName.en : moodText.trim() || "—"}</span>
                <span aria-hidden style={{ transform: showOrder ? "rotate(180deg)" : "none" }}>⌃</span>
              </span>
            </button>
            {showOrder && (
              <div className="max-h-[46vh] overflow-y-auto px-5 pb-2 pt-1">
                <OrderPanel order={order} current={step} onJump={(i) => { setShowOrder(false); setStep(i); }} compact />
              </div>
            )}
            <div className="flex gap-2 px-5 py-3">
              {step > 0 && <button type="button" className="btn btn-outline flex-none" onClick={() => setStep(step - 1)}>←</button>}
              <button type="button" className="btn btn-solid flex-1" disabled={!hasVibe || busy} onClick={advance}>{primaryLabel}</button>
              {!isLast && <button type="button" className="btn btn-outline flex-none" disabled={!hasVibe || busy} onClick={submit} title="Mix now">Mix</button>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
