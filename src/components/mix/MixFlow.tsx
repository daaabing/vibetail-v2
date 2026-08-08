import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

import { encodeCocktailToHash, type Cocktail } from "@/lib/cocktails-store";
import type { PublicMenuItem } from "@/lib/matching/types";
import { pickTashiRecipe } from "@/lib/tashi-recipes";
import { useLang } from "@/lib/i18n";
import { track } from "@/lib/analytics";
import { MOOD_PLACEHOLDERS_EN } from "@/lib/moodtail-data";
import { findVibePick } from "@/lib/vibe-picks";
import {
  DEFAULT_SENSORY,
  loadingLines,
  sensorySummary,
  sensoryTouched,
  type SensoryState,
} from "@/lib/vibeflow";
import {
  BASE_SPIRITS,
  STEP_ACCENTS,
  STEP_IDS,
  STEP_TITLES,
  type AlcoholLevel,
  type MixOrder,
  type StepId,
  buildPreference,
  deriveMenuBaseSpiritKeys,
} from "@/lib/mix-flow";

import MixingOverlay from "@/components/moodtail/MixingOverlay";
import DrinkStage from "@/components/draw/DrinkStage";
import OrderPanel from "./OrderPanel";
import {
  StepHeader,
  StepNotes,
  StepSpirit,
  StepStrength,
  StepTaste,
  StepVibe,
  limitFlavors,
} from "./steps";

export interface MenuContext {
  merchantSlug: string;
  menuSlug: string;
  gameId: string;
  restaurantName?: string;
}

export interface MixFlowProps {
  restaurantId?: string;
  menuSlug?: "dcp";
  menuContext?: MenuContext;
  menuItems?: PublicMenuItem[];
  /** When provided the step index lives in the URL (standalone /mood-input). */
  step?: number;
  onStepChange?: (index: number) => void;
}

const STEP_SUBS: Record<StepId, string> = {
  vibe: "Pick the one that fits tonight. This is the only answer we actually need.",
  taste:
    "Three sliders, by instinct. No cocktail vocabulary required — leave them centred and we'll judge for you.",
  strength: "How hard should tonight hit, and how long should it last?",
  spirit: "Optional. Most people skip this and let the drink decide its own base.",
  notes: "Last call for specifics. Anything here overrides what we inferred.",
};

export default function MixFlow({
  restaurantId,
  menuSlug,
  menuContext,
  menuItems,
  step: controlledStep,
  onStepChange,
}: MixFlowProps) {
  const navigate = useNavigate();
  const { t, lang } = useLang();

  /* ── Flow context ── */
  const effectiveMenuContext: MenuContext | undefined =
    menuContext ??
    (menuSlug === "dcp"
      ? {
          merchantSlug: "double-chicken-please",
          menuSlug: "main",
          gameId: "vibetail-mood",
        }
      : undefined);
  const isMenuFlow = !!effectiveMenuContext;
  const restaurantParam = restaurantId ?? effectiveMenuContext?.merchantSlug;

  // In a real menu flow, only offer base spirits that appear on the published
  // menu. Undefined (demo / standalone) means "show them all".
  const availableSpiritKeys = useMemo(
    () => (menuItems ? deriveMenuBaseSpiritKeys(menuItems) : undefined),
    [menuItems],
  );

  // Figma html-to-design capture drops framer-motion subtrees; render a
  // static section (and no overlays) while a capture hash is present.
  const [figMode, setFigMode] = useState(false);
  useEffect(() => {
    if (window.location.hash.includes("figmacapture")) setFigMode(true);
  }, []);

  /* ── Step navigation ── */
  const [internalStep, setInternalStep] = useState(0);
  const step = Math.min(STEP_IDS.length - 1, Math.max(0, controlledStep ?? internalStep));
  const setStep = (n: number) => {
    const next = Math.min(STEP_IDS.length - 1, Math.max(0, n));
    if (onStepChange) onStepChange(next);
    else setInternalStep(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const stepId = STEP_IDS[step];

  /* ── The order ── */
  const [pickedLabel, setPickedLabel] = useState<string | null>(null);
  const [moodText, setMoodText] = useState("");
  const [sensory, setSensory] = useState<SensoryState>(DEFAULT_SENSORY);
  const [alcohol, setAlcohol] = useState<AlcoholLevel>("standard");
  const [baseSpirit, setBaseSpirit] = useState("");
  const [manualFlavors, setManualFlavors] = useState<string[]>([]);
  const [referenceDrink, setReferenceDrink] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOrder, setShowOrder] = useState(false);

  const order: MixOrder = {
    moodText,
    pickedLabel,
    sensory,
    alcohol,
    baseSpirit,
    manualFlavors,
    referenceDrink,
  };

  const hasVibe = moodText.trim().length > 0 || !!pickedLabel;

  const touchedRef = useRef(false);

  /* ── Handlers ── */
  const exit = () => {
    if (effectiveMenuContext) {
      navigate({
        to: "/m/$merchantSlug/$menuSlug",
        params: {
          merchantSlug: effectiveMenuContext.merchantSlug,
          menuSlug: effectiveMenuContext.menuSlug,
        },
      });
      return;
    }
    if (restaurantId === "double-chicken-please") {
      navigate({ to: "/restaurants/double-chicken-please" });
      return;
    }
    navigate({ to: "/" });
  };

  const pickVibe = (key: string) => {
    touchedRef.current = true;
    if (pickedLabel === key) {
      setPickedLabel(null);
      return;
    }
    const pick = findVibePick(key);
    setPickedLabel(key);
    if (pick) setMoodText(pick.mood);
    track("vibe_quick_selected", {
      selected_vibe: key,
      source: "quick",
      restaurant_id: restaurantParam ?? null,
      menu_id: effectiveMenuContext?.menuSlug ?? null,
    });
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        (navigator as Navigator & { vibrate?: (p: number) => void }).vibrate?.(8);
      } catch {
        // ignore
      }
    }
  };

  const writeMood = (text: string) => {
    touchedRef.current = true;
    setMoodText(text);
    if (text.trim()) setPickedLabel(null);
  };

  /** "Write it yourself" — clears any picked plate and opens the box. */
  const startDiy = () => {
    touchedRef.current = true;
    setPickedLabel(null);
  };

  const changeSensory = (key: keyof SensoryState, v: number) => {
    setSensory((s) => ({ ...s, [key]: v }));
    track("sensory_control_changed", {
      control_name: key,
      control_value: v,
      restaurant_id: restaurantParam ?? null,
      menu_id: effectiveMenuContext?.menuSlug ?? null,
    });
  };

  const handleMix = async () => {
    if (!hasVibe || isGenerating) return;
    setIsGenerating(true);

    const { finalFlavors, drinkLength, customPreference } = buildPreference(order, lang);
    const mood = moodText.trim() || pickedLabel || "";

    track("drink_generation_started", {
      restaurant_id: restaurantParam ?? null,
      menu_id: effectiveMenuContext?.menuSlug ?? null,
      selected_vibe: pickedLabel,
      source: moodText.trim() ? "custom" : "quick",
      sensory_touched: sensoryTouched(sensory),
      final_flavors: finalFlavors,
      drink_length: drinkLength || null,
      base_spirit: baseSpirit || null,
      alcohol_level: alcohol,
    });

    try {
      const tashiPick =
        baseSpirit === "tashi" ? pickTashiRecipe({ selectedFlavors: finalFlavors, mood }) : null;
      const tashiReference = tashiPick
        ? {
            name: tashiPick.name,
            vibe: tashiPick.vibe,
            ingredients: tashiPick.ingredients,
            recipe: tashiPick.recipe,
          }
        : null;

      const endpoint = effectiveMenuContext ? "/api/menu-match" : "/api/generate-cocktail";
      const body = effectiveMenuContext
        ? JSON.stringify({
            merchantSlug: effectiveMenuContext.merchantSlug,
            menuSlug: effectiveMenuContext.menuSlug,
            gameId: effectiveMenuContext.gameId,
            mood,
            selectedFlavors: finalFlavors,
            customPreference,
            lang,
            vibeReference: null,
          })
        : JSON.stringify({
            mood,
            selectedFlavors: finalFlavors,
            customPreference,
            photoIngredients: null,
            lang,
            tashiReference,
            vibeReference: null,
          });

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (!res.ok) {
        if (res.status === 402) {
          toast.error("AI credits exhausted. Please retry later.");
        } else if (res.status === 429) {
          toast.error("Too many requests. Slow down.");
        } else if (res.status === 409 && effectiveMenuContext) {
          const detail = (await res.text().catch(() => "")).toLowerCase();
          if (detail.includes("no active items") || detail.includes("has no")) {
            toast.error("This menu has nothing pourable right now.");
          } else {
            toast.error("AI couldn't mix this.");
          }
        } else {
          toast.error("AI couldn't mix this.");
        }
        setIsGenerating(false);
        return;
      }

      const generated = await res.json();
      const cocktail: Cocktail = {
        id: 0,
        cocktailName: generated.cocktailName,
        originalMood: mood,
        selectedFlavors: finalFlavors,
        customPreference: referenceDrink,
        flavorProfile: generated.flavorProfile,
        tastesLike: generated.tastesLike,
        ingredients: generated.ingredients,
        recipe: generated.recipe,
        roast: generated.roast,
        category: generated.category,
        imageData: null,
        imageUrl: generated.matchedFromMenu ? null : (generated.imageUrl ?? null),
        lang,
        createdAt: new Date().toISOString(),
        userId: null,
        matchedFromMenu: !!generated.matchedFromMenu,
        restaurantName: generated.restaurantName ?? null,
        menuSection: generated.menuSection ?? null,
        menuPrice: generated.menuPrice ?? null,
        whyThisMatch: generated.whyThisMatch ?? null,
        menuItemName: generated.menuItemName ?? null,
        menuItemImageUrl: generated.matchedFromMenu
          ? (generated.menuItemImageUrl ?? generated.imageUrl ?? null)
          : null,
        menuItemDescription: generated.menuItemDescription ?? null,
        menuItemIngredients: generated.menuItemIngredients ?? null,
        fullMenuUrl: generated.fullMenuUrl ?? null,
        fullMenuType: generated.fullMenuType ?? null,
      };

      const encoded = encodeCocktailToHash(cocktail);
      track("cocktail_generated", {
        cocktail_name: generated.cocktailName,
        selected_vibe: pickedLabel,
        source: moodText.trim() ? "custom" : "quick",
        selected_flavor: finalFlavors,
        menu_source: effectiveMenuContext?.merchantSlug ?? null,
        matched_from_menu: !!effectiveMenuContext,
      });

      navigate({
        to: "/drinks/$id",
        params: { id: "preview" },
        search: {
          d: encoded,
          ...(restaurantParam ? { restaurant: restaurantParam } : {}),
          ...(effectiveMenuContext ? { menu: effectiveMenuContext.menuSlug } : {}),
        },
      });
    } catch {
      toast.error("Couldn't read your vibe. Retry.");
      setIsGenerating(false);
    }
  };

  const isLast = step === STEP_IDS.length - 1;
  const primaryLabel = isLast ? "Mix it" : "Continue";

  /* ── Render ── */
  const stepBody = (() => {
    switch (stepId) {
      case "vibe":
        return (
          <StepVibe
            lang={lang}
            moodText={moodText}
            pickedLabel={pickedLabel}
            onPick={pickVibe}
            onText={writeMood}
            onDiy={startDiy}
          />
        );
      case "taste":
        return (
          <StepTaste
            lang={lang}
            sensory={sensory}
            onChange={changeSensory}
            summary={sensorySummary(lang, sensory)}
          />
        );
      case "strength":
        return (
          <StepStrength
            lang={lang}
            alcohol={alcohol}
            onAlcohol={(v) => {
              setAlcohol(v);
              track("alcohol_level_opened", {
                restaurant_id: restaurantParam ?? null,
                menu_id: effectiveMenuContext?.menuSlug ?? null,
              });
            }}
            strength={sensory.strength}
            onStrength={(v) => changeSensory("strength", v)}
          />
        );
      case "spirit":
        return (
          <StepSpirit
            lang={lang}
            baseSpirit={baseSpirit}
            availableKeys={availableSpiritKeys}
            onPick={(key) => {
              setBaseSpirit(key);
              if (key)
                track("base_spirit_preference_opened", {
                  restaurant_id: restaurantParam ?? null,
                  menu_id: effectiveMenuContext?.menuSlug ?? null,
                  base_spirit: key,
                });
            }}
          />
        );
      case "notes":
        return (
          <StepNotes
            lang={lang}
            manualFlavors={manualFlavors}
            onToggleFlavor={(label) => setManualFlavors((prev) => limitFlavors(prev, label, lang))}
            referenceDrink={referenceDrink}
            onReference={setReferenceDrink}
          />
        );
    }
  })();

  const spiritName = BASE_SPIRITS.find((s) => s.key === baseSpirit);

  return (
    <div className="noir min-h-svh" style={{ background: "var(--paper)" }}>
      <div className="flex min-h-svh flex-col lg:grid lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)]">
        {/* ── Left — the drink, building itself ── */}
        <aside
          className="relative h-[36svh] min-h-[280px] lg:sticky lg:top-0 lg:h-svh lg:min-h-0"
          style={{ borderRight: "1px solid var(--line)" }}
        >
          <DrinkStage order={order} hasVibe={hasVibe} step={step} />
        </aside>

        {/* ── Right — the questions, on paper ── */}
        <div className="paper-pocket relative flex min-w-0 flex-col" style={{ background: "var(--paper)" }}>
          {/* Top bar */}
          <div
            className="sticky top-0 z-30"
            style={{
              background: "rgba(242,241,238,0.94)",
              backdropFilter: "blur(8px)",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <div className="flex items-center justify-between gap-4 px-[clamp(20px,4vw,64px)] py-3.5">
              <button
                type="button"
                onClick={step === 0 ? exit : () => setStep(step - 1)}
                className="mono flex items-center gap-2"
              >
                <span aria-hidden>←</span>
                {step === 0 ? t("mood.exit") : t("mood.back")}
              </button>

              <div className="flex flex-1 items-center gap-1.5 px-2" aria-hidden>
                {STEP_IDS.map((id, i) => (
                  <span
                    key={id}
                    className="h-[2px] flex-1 transition-colors"
                    style={{
                      background:
                        i < step ? "var(--ink-mute)" : i === step ? "var(--ink)" : "var(--line)",
                    }}
                  />
                ))}
              </div>

              <span className="mono-sm hidden sm:inline" style={{ color: "var(--ink)" }}>
                {String(step + 1).padStart(2, "0")}
                <span style={{ color: "var(--ink-faint)" }}>
                  /{String(STEP_IDS.length).padStart(2, "0")}
                </span>
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="flex min-w-0 flex-1 flex-col justify-center px-[clamp(20px,4vw,64px)] pb-40 pt-10 lg:pb-16">
            {figMode ? (
              <section>
                <StepHeader
                  index={step}
                  total={STEP_IDS.length}
                  accent={STEP_ACCENTS[stepId]}
                  title={STEP_TITLES[stepId].en}
                  sub={STEP_SUBS[stepId]}
                />
                {stepBody}
              </section>
            ) : (
              <AnimatePresence mode="wait">
                <motion.section
                  key={stepId}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <StepHeader
                    index={step}
                    total={STEP_IDS.length}
                    accent={STEP_ACCENTS[stepId]}
                    title={STEP_TITLES[stepId].en}
                    sub={STEP_SUBS[stepId]}
                  />
                  {stepBody}
                </motion.section>
              </AnimatePresence>
            )}

            {/* Desktop step controls */}
            <div className="mt-12 hidden items-center gap-3 lg:flex">
              {step > 0 && (
                <button className="btn btn-outline" onClick={() => setStep(step - 1)}>
                  {t("mood.back")}
                </button>
              )}
              <button
                className="btn btn-solid"
                disabled={!hasVibe || isGenerating}
                onClick={() => (isLast ? handleMix() : setStep(step + 1))}
              >
                {primaryLabel}
                <span aria-hidden>→</span>
              </button>
              {!isLast && (
                <button
                  className="mono-sm underline underline-offset-4"
                  onClick={handleMix}
                  disabled={!hasVibe || isGenerating}
                >
                  {"Skip the rest, just mix it"}
                </button>
              )}
            </div>
          </div>

          {/* ── Mobile bottom bar ── */}
          <div
            className="fixed inset-x-0 bottom-0 z-30 lg:hidden"
            style={{
              background: "var(--paper)",
              borderTop: "1px solid var(--line-strong)",
              paddingBottom: "env(safe-area-inset-bottom)",
            }}
          >
            <button
              type="button"
              onClick={() => setShowOrder((s) => !s)}
              className="mono flex w-full items-center justify-between px-5 py-2.5"
              style={{ borderBottom: showOrder ? "1px solid var(--line)" : undefined }}
            >
              <span>{"The order"}</span>
              <span className="flex items-center gap-2">
                <span className="mono-sm truncate" style={{ maxWidth: 150, color: "var(--ink)" }}>
                  {spiritName ? spiritName.en : moodText.trim() || "—"}
                </span>
                <span aria-hidden style={{ transform: showOrder ? "rotate(180deg)" : "none" }}>
                  ⌃
                </span>
              </span>
            </button>

            {showOrder && (
              <div className="max-h-[46vh] overflow-y-auto px-5 pb-2 pt-1">
                <OrderPanel
                  order={order}
                  current={step}
                  onJump={(i) => {
                    setShowOrder(false);
                    setStep(i);
                  }}
                  compact
                />
              </div>
            )}

            <div className="flex gap-2 px-5 py-3">
              {step > 0 && (
                <button className="btn btn-outline flex-none" onClick={() => setStep(step - 1)}>
                  ←
                </button>
              )}
              <button
                className="btn btn-solid flex-1"
                disabled={!hasVibe || isGenerating}
                onClick={() => (isLast ? handleMix() : setStep(step + 1))}
              >
                {primaryLabel}
              </button>
              {!isLast && (
                <button
                  className="btn btn-outline flex-none"
                  disabled={!hasVibe || isGenerating}
                  onClick={handleMix}
                  title={"Mix now"}
                >
                  {"Mix"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <MixingOverlay open={isGenerating} lines={loadingLines(lang, isMenuFlow)} />
    </div>
  );
}
