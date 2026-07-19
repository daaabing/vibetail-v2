import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { encodeCocktailToHash, type Cocktail } from "@/lib/cocktails-store";
import { FLAVOR_CHIPS } from "@/lib/moodtail-data";
import { pickTashiRecipe } from "@/lib/tashi-recipes";
import { pickVibeExample } from "@/lib/vibe-examples";
import { useLang } from "@/lib/i18n";
import { track } from "@/lib/analytics";

import VibeBottle from "@/components/moodtail/VibeBottle";
import MixingOverlay from "@/components/moodtail/MixingOverlay";
import FlowProgress from "@/components/moodtail/vibeflow/FlowProgress";
import LangToggle from "@/components/moodtail/LangToggle";
import FloatingVibes from "@/components/moodtail/vibeflow/FloatingVibes";
import { VIBE_ROWS_EN, VIBE_ROWS_ZH } from "@/lib/vibe-cloud";
import { MOOD_PLACEHOLDERS_EN, MOOD_PLACEHOLDERS_ZH } from "@/lib/moodtail-data";
import { getMoodConfig } from "@/lib/mood-config";
import SensoryControl from "@/components/moodtail/vibeflow/SensoryControl";

import {
  DEFAULT_SENSORY,
  QUICK_VIBES,
  computeBottleColor,
  computeFill,
  getVibe,
  loadingLines,
  sensorySummary,
  sensoryTouched,
  sensoryToFlavors,
  strengthToDrinkLength,
  type SensoryState,
  type VibeKey,
} from "@/lib/vibeflow";

type MenuContext = {
  merchantSlug: string;
  menuSlug: string;
  gameId: string;
  restaurantName?: string;
};

type Stage = "vibe" | "transition" | "sensory";

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return `rgba(143, 182, 200, ${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const BASE_SPIRITS: { key: string; en: string; zh: string; color: string }[] = [
  { key: "gin", en: "Gin", zh: "金酒", color: "#7fb069" },
  { key: "vodka", en: "Vodka", zh: "伏特加", color: "#a3b8c4" },
  { key: "rum", en: "Rum", zh: "朗姆", color: "#c08457" },
  { key: "tequila", en: "Tequila", zh: "龙舌兰", color: "#e0b96b" },
  { key: "whiskey", en: "Whiskey", zh: "威士忌", color: "#a0522d" },
  { key: "mezcal", en: "Mezcal", zh: "梅斯卡尔", color: "#8b6f4e" },
  { key: "brandy", en: "Brandy", zh: "白兰地", color: "#b8602e" },
  { key: "sake", en: "Sake", zh: "清酒", color: "#e8dcc4" },
  { key: "tashi", en: "Tashi", zh: "Tashi 青稞酒", color: "#c9a84c" },
  { key: "nonalcoholic", en: "No alcohol", zh: "无酒精", color: "#d4a5c4" },
];

export default function MoodInputScreen({
  restaurantId,
  menuSlug,
  menuContext,
}: {
  restaurantId?: string;
  menuSlug?: "dcp";
  menuContext?: MenuContext;
} = {}) {
  const navigate = useNavigate();
  const { t, lang } = useLang();

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

  // ── Stage 1: vibe ─────────────────────────────────────────────────
  const [stage, setStage] = useState<Stage>("vibe");
  const [pickedLabel, setPickedLabel] = useState<string | null>(null);
  const [pickedColor, setPickedColor] = useState<string>("#99B9C6");
  const [customMood, setCustomMood] = useState<string>(""); // when non-empty, overrides pill

  // ── Stage 2: sensory + optional accordions ────────────────────────
  const [sensory, setSensory] = useState<SensoryState>(DEFAULT_SENSORY);
  const [expandedFlavors, setExpandedFlavors] = useState(false);
  const [manualFlavors, setManualFlavors] = useState<string[]>([]);
  const [expandedStrength, setExpandedStrength] = useState(false);
  const [expandedAlcohol, setExpandedAlcohol] = useState(false);
  const [selectedAlcoholLevel, setSelectedAlcoholLevel] = useState<
    "low" | "standard" | "strong" | "zero"
  >("standard");
  const [expandedSpirit, setExpandedSpirit] = useState(false);
  const [baseSpirit, setBaseSpirit] = useState<string>("");
  const [expandedRef, setExpandedRef] = useState(false);
  const [referenceDrink, setReferenceDrink] = useState<string>("");

  // ── Generation ────────────────────────────────────────────────────
  const [isGenerating, setIsGenerating] = useState(false);

  // ── Derived vibe ──────────────────────────────────────────────────
  const hasVibe = !!pickedLabel || customMood.trim().length > 0;

  const moodText = useMemo(() => {
    if (customMood.trim()) return customMood.trim();
    return pickedLabel ?? "";
  }, [customMood, pickedLabel]);

  // Mood-specific liquid color + reply line (falls back to picked row color).
  const moodCfg = useMemo(
    () => getMoodConfig(pickedLabel, pickedColor, lang),
    [pickedLabel, pickedColor, lang],
  );

  const replyLine = useMemo(() => {
    if (!hasVibe) return "";
    if (customMood.trim()) {
      return lang === "zh"
        ? "收到，这个状态很适合调一杯。"
        : "Got it. That's a good state to mix from.";
    }
    return moodCfg.response;
  }, [hasVibe, customMood, moodCfg, lang]);

  const baseColor = customMood.trim() ? "#B7A9B3" : moodCfg.color;
  const liveBottleColor = computeBottleColor(baseColor, sensory);
  const liveFill = computeFill(hasVibe, sensory);

  // ── Flow control ──────────────────────────────────────────────────
  const goHome = () => {
    // In a merchant/restaurant flow, exit back to that menu's landing page.
    // Otherwise return to the app home.
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


  const pickVibe = (label: string, color: string) => {
    if (pickedLabel === label) {
      setPickedLabel(null);
      return;
    }
    setPickedLabel(label);
    setPickedColor(color);
    setCustomMood("");
    track("vibe_quick_selected", {
      selected_vibe: label,
      source: "quick",
      restaurant_id: restaurantParam ?? null,
      menu_id: effectiveMenuContext?.menuSlug ?? null,
    });
    if ("vibrate" in navigator) {
      try { (navigator as any).vibrate?.(8); } catch {}
    }
  };



  const submitCustom = (text: string) => {
    setCustomMood(text);
    if (text.trim()) {
      setPickedLabel(null);
      track("vibe_custom_submitted", {
        custom_text_length: text.length,
        source: "custom",
        restaurant_id: restaurantParam ?? null,
        menu_id: effectiveMenuContext?.menuSlug ?? null,
      });
    }
  };

  const enterSensory = () => {
    if (!hasVibe) return;
    setStage("transition");
    window.setTimeout(() => setStage("sensory"), 950);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const changeSensory = (name: keyof SensoryState, v: number) => {
    setSensory((s) => ({ ...s, [name]: v }));
    track("sensory_control_changed", {
      control_name: name,
      control_value: v,
      restaurant_id: restaurantParam ?? null,
      menu_id: effectiveMenuContext?.menuSlug ?? null,
    });
  };

  const toggleManualFlavor = (label: string) => {
    setManualFlavors((prev) => {
      if (prev.includes(label)) return prev.filter((f) => f !== label);
      if (prev.length >= 3) {
        toast(lang === "zh" ? "最多选 3 个就够了" : "3 flavors is plenty");
        return prev;
      }
      return [...prev, label];
    });
  };

  // ── Submit ────────────────────────────────────────────────────────
  const handleMix = async () => {
    if (!hasVibe || isGenerating) return;
    setIsGenerating(true);

    const flavorsFromSensory = sensoryToFlavors(sensory);
    const finalFlavors = manualFlavors.length ? manualFlavors : flavorsFromSensory;
    const drinkLength = strengthToDrinkLength(sensory);

    track("drink_generation_started", {
      restaurant_id: restaurantParam ?? null,
      menu_id: effectiveMenuContext?.menuSlug ?? null,
      selected_vibe: pickedLabel,
      source: customMood.trim() ? "custom" : "quick",
      sensory_touched: sensoryTouched(sensory),
      final_flavors: finalFlavors,
      drink_length: drinkLength || null,
      base_spirit: baseSpirit || null,
    });

    try {
      const spiritObj = BASE_SPIRITS.find((s) => s.key === baseSpirit);
      const spiritNote = spiritObj
        ? lang === "zh"
          ? `基酒：${spiritObj.zh}。`
          : `Base spirit: ${spiritObj.en}. `
        : "";
      const lengthNote =
        drinkLength === "long"
          ? lang === "zh"
            ? "杯型：长饮（高杯，加冰，含较多 mixer，慢慢享用）。"
            : "Format: Long drink (tall glass, plenty of ice and mixer, sippable). "
          : drinkLength === "short"
            ? lang === "zh"
              ? "杯型：短饮（小杯，烈酒为主，少 mixer，浓郁集中）。"
              : "Format: Short drink (small glass, spirit-forward, minimal mixer, concentrated). "
            : "";
      const summary = sensorySummary(lang, sensory);
      const alcoholMap = {
        low: { zh: "酒精度：低酒精 / 微醺（轻盈，不易上头）。", en: "Alcohol level: low / light buzz. " },
        standard: { zh: "酒精度：标准（正常一杯，平衡）。", en: "Alcohol level: standard. " },
        strong: { zh: "酒精度：偏烈一点（酒感更明显）。", en: "Alcohol level: strong / spirit-forward. " },
        zero: { zh: "酒精度：无酒精（mocktail，只要氛围）。", en: "Alcohol level: zero-proof mocktail. " },
      } as const;
      const alcoholNote = alcoholMap[selectedAlcoholLevel][lang === "zh" ? "zh" : "en"];
      const mergedPreference = (spiritNote + lengthNote + alcoholNote + summary + " " + (referenceDrink || "")).trim();

      const tashiPick =
        baseSpirit === "tashi"
          ? pickTashiRecipe({ selectedFlavors: finalFlavors, mood: moodText })
          : null;
      const tashiReference = tashiPick
        ? {
            name: tashiPick.name,
            vibe: tashiPick.vibe,
            ingredients: tashiPick.ingredients,
            recipe: tashiPick.recipe,
          }
        : null;

      const vibePick =
        lang === "zh"
          ? pickVibeExample(moodText, {
              selectedFlavors: finalFlavors,
              customPreference: mergedPreference,
              baseSpirit,
              drinkLength,
            })
          : null;
      const vibeReference = vibePick
        ? {
            name: vibePick.name,
            tastesLike: vibePick.tastesLike,
            flavorProfile: vibePick.flavorProfile,
            nameStyle: vibePick.nameStyle ?? "absurd",
          }
        : null;

      const endpoint = effectiveMenuContext ? "/api/menu-match" : "/api/generate-cocktail";
      const body = effectiveMenuContext
        ? JSON.stringify({
            merchantSlug: effectiveMenuContext.merchantSlug,
            menuSlug: effectiveMenuContext.menuSlug,
            gameId: effectiveMenuContext.gameId,
            mood: moodText,
            selectedFlavors: finalFlavors,
            customPreference: mergedPreference,
            lang,
            vibeReference,
          })
        : JSON.stringify({
            mood: moodText,
            selectedFlavors: finalFlavors,
            customPreference: mergedPreference,
            photoIngredients: null,
            lang,
            tashiReference,
            vibeReference,
          });

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (!res.ok) {
        if (res.status === 402) {
          toast.error(
            lang === "zh"
              ? "AI 额度不足，请稍后再试。"
              : "AI credits exhausted. Please retry later.",
          );
        } else if (res.status === 429) {
          toast.error(
            lang === "zh" ? "请求太频繁，请稍等再试。" : "Too many requests. Slow down.",
          );
        } else if (res.status === 409 && effectiveMenuContext) {
          const detail = (await res.text().catch(() => "")).toLowerCase();
          if (detail.includes("no active items") || detail.includes("has no")) {
            toast.error(
              lang === "zh"
                ? "这份菜单暂时没有可点的酒。"
                : "This menu has nothing pourable right now.",
            );
          } else {
            toast.error(lang === "zh" ? "AI 调制失败，请重试。" : "AI couldn't mix this.");
          }
        } else {
          toast.error(lang === "zh" ? "AI 调制失败，请重试。" : "AI couldn't mix this.");
        }
        setIsGenerating(false);
        return;
      }

      const generated = await res.json();
      const cocktail: Cocktail = {
        id: 0,
        cocktailName: generated.cocktailName,
        originalMood: moodText,
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
        menuItemImageUrl: generated.matchedFromMenu ? (generated.imageUrl ?? null) : null,
        menuItemDescription: generated.menuItemDescription ?? null,
        menuItemIngredients: generated.menuItemIngredients ?? null,
      };

      const encoded = encodeCocktailToHash(cocktail);
      track("cocktail_generated", {
        cocktail_name: generated.cocktailName,
        selected_vibe: pickedLabel,
        source: customMood.trim() ? "custom" : "quick",
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
      toast.error(lang === "zh" ? "无法读取你的 vibe，请重试！" : "Couldn't read your vibe. Retry.");
      setIsGenerating(false);
    }
  };

  const bottleSize =
    stage === "vibe" ? 300 : stage === "transition" ? 220 : 180;

  return (
    <div
      className="w-full md:max-w-[520px] md:mx-auto flex flex-col overflow-hidden"
      data-vibetail-flow="vibeflow"
      style={{ background: "transparent", height: "100dvh" }}
    >
      {/* ── Top bar ── */}
      <div className="flex-none flex items-center justify-between px-5 pt-[max(12px,env(safe-area-inset-top))] pb-2">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={stage === "sensory" ? () => setStage("vibe") : goHome}
          className="flex items-center gap-1.5"
          style={{ color: "var(--app-text-secondary)" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M15.75 19.5L8.25 12l7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] tracking-wider" style={{ fontFamily: "var(--font-body)" }}>
            {stage === "sensory" ? t("mood.back") : t("mood.exit")}
          </span>
        </motion.button>

        <FlowProgress stage={stage === "sensory" ? 2 : 1} />

        <LangToggle />

      </div>


      <AnimatePresence mode="wait">
        {stage === "vibe" && (
          <StageOne
            key="vibe"
            lang={lang}
            liveBottleColor={liveBottleColor}
            liveFill={liveFill}
            bottleSize={bottleSize}
            replyLine={replyLine}
            pickedLabel={pickedLabel}
            customMood={customMood}
            hasVibe={hasVibe}
            onPickVibe={pickVibe}
            onCustomChange={submitCustom}
            onClearCustom={() => setCustomMood("")}
            onNext={enterSensory}
          />
        )}

        {stage === "transition" && (
          <TransitionStage
            key="transition"
            liveBottleColor={liveBottleColor}
            liveFill={liveFill}
            lang={lang}
          />
        )}

        {stage === "sensory" && (
          <StageTwo
            key="sensory"
            lang={lang}
            isMenuFlow={isMenuFlow}
            liveBottleColor={liveBottleColor}
            liveFill={liveFill}
            bottleSize={bottleSize}
            sensory={sensory}
            summary={sensorySummary(lang, sensory)}
            changeSensory={changeSensory}
            expandedFlavors={expandedFlavors}
            setExpandedFlavors={(v) => {
              setExpandedFlavors(v);
              if (v)
                track("detailed_flavors_expanded", {
                  restaurant_id: restaurantParam ?? null,
                  menu_id: effectiveMenuContext?.menuSlug ?? null,
                });
            }}
            manualFlavors={manualFlavors}
            toggleManualFlavor={toggleManualFlavor}
            expandedStrength={expandedStrength}
            setExpandedStrength={setExpandedStrength}
            expandedAlcohol={expandedAlcohol}
            setExpandedAlcohol={(v) => {
              setExpandedAlcohol(v);
              if (v)
                track("alcohol_level_opened", {
                  restaurant_id: restaurantParam ?? null,
                  menu_id: effectiveMenuContext?.menuSlug ?? null,
                });
            }}
            selectedAlcoholLevel={selectedAlcoholLevel}
            setSelectedAlcoholLevel={setSelectedAlcoholLevel}
            expandedSpirit={expandedSpirit}
            setExpandedSpirit={(v) => {
              setExpandedSpirit(v);
              if (v)
                track("base_spirit_preference_opened", {
                  restaurant_id: restaurantParam ?? null,
                  menu_id: effectiveMenuContext?.menuSlug ?? null,
                });
            }}
            baseSpirit={baseSpirit}
            setBaseSpirit={setBaseSpirit}
            expandedRef={expandedRef}
            setExpandedRef={(v) => {
              setExpandedRef(v);
              if (v)
                track("reference_drink_expanded", {
                  restaurant_id: restaurantParam ?? null,
                  menu_id: effectiveMenuContext?.menuSlug ?? null,
                });
            }}
            referenceDrink={referenceDrink}
            setReferenceDrink={setReferenceDrink}
            isGenerating={isGenerating}
            touched={sensoryTouched(sensory) || manualFlavors.length > 0 || baseSpirit !== "" || referenceDrink !== ""}
            onMix={handleMix}
          />
        )}
      </AnimatePresence>


      <MixingOverlay
        open={isGenerating}
        color={liveBottleColor}
        lines={loadingLines(lang, isMenuFlow)}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Stage 1 — "Pour your state into the bottle"
// ─────────────────────────────────────────────────────────────────────────
function StageOne({
  lang,
  liveBottleColor,
  liveFill,
  bottleSize,
  replyLine,
  pickedLabel,
  customMood,
  hasVibe,
  onPickVibe,
  onCustomChange,
  onClearCustom: _onClearCustom,
  onNext,
}: {
  lang: "zh" | "en";
  liveBottleColor: string;
  liveFill: number;
  bottleSize: number;
  replyLine: string;
  pickedLabel: string | null;
  customMood: string;
  hasVibe: boolean;
  onPickVibe: (label: string, color: string) => void;
  onCustomChange: (text: string) => void;
  onClearCustom: () => void;
  onNext: () => void;
}) {
  const placeholders = lang === "zh" ? MOOD_PLACEHOLDERS_ZH : MOOD_PLACEHOLDERS_EN;
  const [phIdx, setPhIdx] = useState(() =>
    Math.floor(Math.random() * placeholders.length),
  );
  const ph = placeholders[phIdx % placeholders.length];
  const shrunkBottle = Math.round(bottleSize * 0.85);

  return (
    <motion.div
      key="stage1"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="stage-one flex-1 min-h-0 flex flex-col overflow-hidden"
    >
      {/* Title (fixed) */}
      <div className="stage-one-header flex-none text-center px-5 pt-1">
        <h1
          className="stage-one-title text-[22px] leading-tight"
          style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)" }}
        >
          {lang === "zh" ? "把现在的心情，倒进杯里。" : "What's your vibe right now?"}
        </h1>
        <p
          className="stage-one-sub text-[11px] mt-0.5 italic"
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--app-text-secondary)",
          }}
        >
          {lang === "zh"
            ? "选一个最像你的，或者随手写一句。"
            : "Pick one that fits, or type your own."}
        </p>
      </div>

      {/* Scrollable middle region */}
      <div
        className="stage-one-scroll flex-1 min-h-0 overflow-y-auto no-scrollbar px-5"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
        }}
      >
        {/* Bottle */}
        <div className="bottle-section flex items-center justify-center flex-col" style={{ width: "100%" }}>
          <div className="bottle-visual">
            <div
              className="bottle-aura"
              style={{
                background: `radial-gradient(ellipse at 50% 45%, ${liveBottleColor}22 0%, ${liveBottleColor}08 35%, transparent 70%)`,
              }}
            />
            <VibeBottle
              color={liveBottleColor}
              size={300}
              mode="idle"
              sliderVal={liveFill}
              glow={false}
            />
          </div>

          <div className="mood-response" style={{ marginTop: 8, minHeight: 24 }}>
            <AnimatePresence mode="wait">
              {hasVibe && (
                <motion.span
                  key={replyLine + customMood + pickedLabel}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.22 }}
                  className="mood-response-line"
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: 18,
                    lineHeight: 1.35,
                    color: "var(--app-primary)",
                    fontStyle: "italic",
                    textAlign: "center",
                  }}
                >
                  {replyLine}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Tag cloud */}
        <div
          className="mood-tags-section relative w-full mx-auto"
          style={{ maxWidth: 600, marginTop: 6 }}
        >
          <FloatingVibesInline
            lang={lang}
            selected={pickedLabel}
            onPick={onPickVibe}
          />
        </div>

        {/* Inline custom mood input */}
        <div className="stage-one-input mt-3 pb-2">
          <label
            className="stage-one-input-label block text-[11px] tracking-wider mb-1 px-1"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--app-text-secondary)",
              letterSpacing: "0.08em",
            }}
          >
            {lang === "zh" ? "描述一下现在的精神状态" : "Describe your current headspace"}
          </label>
          <div
            className="stage-one-input-box relative rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.10)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              transition: "border-color 200ms, box-shadow 200ms",
              boxShadow: customMood
                ? "0 0 0 1px rgba(153,185,198,0.35), 0 0 16px rgba(153,185,198,0.18)"
                : "none",
            }}
          >
            <textarea
              value={customMood}
              onChange={(e) => onCustomChange(e.target.value)}
              onFocus={(e) => {
                const el = e.currentTarget;
                setTimeout(() => {
                  el?.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 280);
              }}
              placeholder={ph}
              rows={2}
              className="stage-one-textarea w-full resize-none bg-transparent outline-none rounded-2xl px-4 pt-2.5 pb-7 text-sm leading-snug"
              style={{
                minHeight: 82,
                maxHeight: 110,
                color: "var(--app-text)",
                fontFamily: "var(--font-heading)",
                fontStyle: customMood ? "normal" : "italic",
                scrollMarginBottom: 140,
              }}
            />
            <button
              type="button"
              onClick={() =>
                setPhIdx((i) => {
                  let next = Math.floor(Math.random() * placeholders.length);
                  if (next === i % placeholders.length) next = (next + 1) % placeholders.length;
                  return next;
                })
              }
              className="absolute bottom-1.5 right-2 text-[10px] tracking-wider px-2 py-1 rounded-full"
              style={{
                fontFamily: "var(--font-body)",
                color: "var(--app-text-muted)",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {lang === "zh" ? "随机来一句" : "Random line"}
            </button>
          </div>
        </div>
      </div>

      {/* Sticky footer CTA — always visible in viewport */}
      <div
        className="stage-one-cta flex-none px-5"
        style={{
          paddingTop: 10,
          paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
          background:
            "linear-gradient(to top, rgba(24,25,28,0.96) 55%, rgba(24,25,28,0))",
          position: "relative",
          zIndex: 20,
        }}
      >
        <motion.button
          onClick={onNext}
          disabled={!hasVibe}
          whileTap={hasVibe ? { scale: 0.97 } : undefined}
          className="continue-button w-full rounded-2xl text-sm font-semibold tracking-wider"
          style={{
            fontFamily: "var(--font-heading)",
            color: "white",
            minHeight: 52,
            opacity: hasVibe ? 1 : 0.45,
            background: hasVibe
              ? "linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.16) 100%)"
              : "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow: hasVibe
              ? "0 12px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.14)"
              : "none",
            transition: "opacity 220ms, background 220ms",
          }}
        >
          {lang === "zh" ? "继续调味" : "Continue → season it"}
        </motion.button>
      </div>

      <style>{`
        .bottle-visual {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bottle-visual > * { position: relative; z-index: 1; }
        .bottle-aura {
          position: absolute;
          width: 200%;
          height: 200%;
          left: -50%;
          top: -50%;
          z-index: 0;
          filter: blur(44px);
          opacity: 0.28;
          pointer-events: none;
          transform: scale(1.2);
        }

        /* Desktop / tablet — keep prior sizing */
        @media (min-width: 768px) {
          .bottle-section svg,
          .bottle-section img {
            height: 300px;
            width: auto;
          }
        }

        /* ─── Mobile (< 768px) ─── */
        @media (max-width: 767px) {
          .stage-one-title { font-size: clamp(22px, 6vw, 28px) !important; }
          .stage-one-sub   { font-size: 12px !important; }

          .bottle-section { padding-top: 4px; }
          .bottle-section svg,
          .bottle-section img {
            height: clamp(170px, 24dvh, 230px) !important;
            width: auto !important;
          }
          .mood-response { margin-top: 4px !important; min-height: 20px !important; }
          .mood-response-line { font-size: 15px !important; }

          .mood-tag {
            min-height: 34px !important;
            padding: 6px 12px !important;
            font-size: 14px !important;
            line-height: 20px !important;
            border-radius: 999px !important;
          }

          .stage-one-textarea {
            min-height: 82px !important;
            font-size: 15px !important;
          }
        }

        /* Short phones (iPhone SE / mini) */
        @media (max-width: 767px) and (max-height: 720px) {
          .stage-one-title { font-size: 22px !important; }
          .bottle-section svg,
          .bottle-section img {
            height: 170px !important;
          }
          .mood-tag {
            min-height: 32px !important;
            padding: 5px 11px !important;
            font-size: 13px !important;
          }
          .stage-one-textarea { min-height: 72px !important; }
        }
      `}</style>
    </motion.div>
  );
}

// Inline vibe cloud that participates in normal document flow (no nested
// scroll). Overrides the internal scroll container from FloatingVibes so the
// mobile page has a single, natural scroll instead of a scroll trap.
function FloatingVibesInline({
  lang,
  selected,
  onPick,
}: {
  lang: "zh" | "en";
  selected: string | null;
  onPick: (label: string, color: string) => void;
}) {
  const rows = lang === "zh" ? VIBE_ROWS_ZH : VIBE_ROWS_EN;
  const items = rows.flatMap((r) =>
    r.labels.map((label) => ({ label, color: r.color })),
  );
  const anyPicked = !!selected;
  return (
    <div
      className="vibe-chip-container"
      style={{
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "8px 7px",
        padding: "4px 6px 8px",
      }}
    >
      {items.map((it, i) => {
        const isSel = selected === it.label;
        return (
          <button
            key={`${it.label}-${i}`}
            type="button"
            onClick={() => onPick(it.label, it.color)}
            className="mood-tag shrink-0 rounded-full active:scale-95"
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              padding: "6px 12px",
              lineHeight: 1.15,
              whiteSpace: "nowrap",
              border: isSel
                ? `1.4px solid ${it.color}`
                : "1px solid rgba(255,255,255,0.10)",
              background: isSel ? `${it.color}2E` : "rgba(255,255,255,0.045)",
              color: isSel ? "var(--app-text)" : "var(--app-text-secondary)",
              opacity: anyPicked && !isSel ? 0.5 : 1,
              boxShadow: isSel ? `0 0 18px ${it.color}55` : "none",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              transition:
                "background 200ms, border-color 200ms, opacity 200ms, transform 120ms",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: 5,
                height: 5,
                borderRadius: 999,
                background: isSel ? "currentColor" : it.color,
                marginRight: 6,
                verticalAlign: "middle",
                opacity: isSel ? 1 : 0.7,
              }}
            />
            {it.label}
          </button>
        );
      })}
    </div>
  );
}





// ─────────────────────────────────────────────────────────────────────────
// Stage transition
// ─────────────────────────────────────────────────────────────────────────
function TransitionStage({
  liveBottleColor,
  liveFill,
  lang,
}: {
  liveBottleColor: string;
  liveFill: number;
  lang: "zh" | "en";
}) {
  return (
    <motion.div
      key="transition"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="flex-1 flex flex-col items-center justify-center px-5"
    >
      <motion.div
        animate={{ rotate: [0, -4, 4, -2, 0] }}
        transition={{ duration: 0.85, ease: "easeInOut" }}
      >
        <VibeBottle
          color={liveBottleColor}
          size={220}
          mode="mixing"
          sliderVal={liveFill}
        />
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.35 }}
        className="mt-6 text-sm italic text-center"
        style={{
          fontFamily: "var(--font-heading)",
          color: "var(--app-text-secondary)",
        }}
      >
        {lang === "zh" ? "收到。现在给它一点味道。" : "Got it. Now give it a taste."}
      </motion.p>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Stage 2 — sensory console
// ─────────────────────────────────────────────────────────────────────────
function StageTwo(props: {
  lang: "zh" | "en";
  isMenuFlow: boolean;
  liveBottleColor: string;
  liveFill: number;
  bottleSize: number;
  sensory: SensoryState;
  summary: string;
  changeSensory: (name: keyof SensoryState, v: number) => void;
  expandedFlavors: boolean;
  setExpandedFlavors: (v: boolean) => void;
  manualFlavors: string[];
  toggleManualFlavor: (label: string) => void;
  expandedStrength: boolean;
  setExpandedStrength: (v: boolean) => void;
  expandedAlcohol: boolean;
  setExpandedAlcohol: (v: boolean) => void;
  selectedAlcoholLevel: "low" | "standard" | "strong" | "zero";
  setSelectedAlcoholLevel: (v: "low" | "standard" | "strong" | "zero") => void;
  expandedSpirit: boolean;
  setExpandedSpirit: (v: boolean) => void;
  baseSpirit: string;
  setBaseSpirit: (v: string) => void;
  expandedRef: boolean;
  setExpandedRef: (v: boolean) => void;
  referenceDrink: string;
  setReferenceDrink: (v: string) => void;
  isGenerating: boolean;
  touched: boolean;
  onMix: () => void;
}) {
  const {
    lang,
    liveBottleColor,
    liveFill,
    bottleSize,
    sensory,
    summary,
    changeSensory,
    expandedFlavors,
    setExpandedFlavors,
    manualFlavors,
    toggleManualFlavor,
    expandedStrength,
    setExpandedStrength,
    expandedAlcohol,
    setExpandedAlcohol,
    selectedAlcoholLevel,
    setSelectedAlcoholLevel,
    expandedSpirit,
    setExpandedSpirit,
    baseSpirit,
    setBaseSpirit,
    expandedRef,
    setExpandedRef,
    referenceDrink,
    setReferenceDrink,
    isGenerating,
    touched,
    onMix,
  } = props;

  const zh = lang === "zh";
  const ctaLabel = isGenerating
    ? zh
      ? "正在调制…"
      : "Mixing…"
    : touched
      ? zh
        ? "按这个感觉调一杯"
        : "Mix it this way"
      : zh
        ? "这杯交给你了"
        : "Leave it to you";

  return (
    <motion.div
      key="stage2"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="flex-1 min-h-0 flex flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+96px)] overflow-y-auto no-scrollbar"
    >
      <div className="text-center pt-1">
        <h1
          className="text-[24px] leading-tight"
          style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)" }}
        >
          {zh ? "想把它调成什么感觉？" : "How should it feel?"}
        </h1>
        <p
          className="text-xs mt-1 italic"
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--app-text-secondary)",
          }}
        >
          {zh ? "凭直觉选，不用懂酒。" : "Pick by instinct — no cocktail lingo needed."}
        </p>
      </div>

      <div className="flex justify-center pt-1 pb-2">
        <VibeBottle
          color={liveBottleColor}
          size={bottleSize}
          mode="idle"
          sliderVal={liveFill}
        />
      </div>

      {/* Three sensory sliders */}
      <div className="mt-1 space-y-5">
        <SensoryControl
          value={sensory.fresh}
          onChange={(v) => changeSensory("fresh", v)}
          leftLabel={zh ? "清爽" : "Crisp"}
          rightLabel={zh ? "浓郁" : "Rich"}
        />
        <SensoryControl
          value={sensory.soft}
          onChange={(v) => changeSensory("soft", v)}
          leftLabel={zh ? "柔和" : "Soft"}
          rightLabel={zh ? "刺激" : "Bold"}
          accent="var(--app-accent-lav)"
        />
        <SensoryControl
          value={sensory.familiar}
          onChange={(v) => changeSensory("familiar", v)}
          leftLabel={zh ? "熟悉" : "Familiar"}
          rightLabel={zh ? "意外" : "Unexpected"}
          accent="var(--app-accent-sage)"
        />
      </div>

      <p
        className="mt-4 text-xs text-center"
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--app-text-secondary)",
        }}
      >
        {summary}
      </p>

      {/* Accordions */}
      <div className="mt-5 space-y-2">
        <Accordion
          open={expandedFlavors}
          onToggle={() => setExpandedFlavors(!expandedFlavors)}
          label={
            zh
              ? `我想自己选具体味道${manualFlavors.length ? ` · ${manualFlavors.length}/3` : ""}`
              : `Pick specific flavors${manualFlavors.length ? ` · ${manualFlavors.length}/3` : ""}`
          }
        >
          <div className="flex flex-wrap gap-2 pt-1">
            {FLAVOR_CHIPS.map((c) => {
              const sel = manualFlavors.includes(c.label);
              return (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => toggleManualFlavor(c.label)}
                  className="text-xs px-3 py-1.5 rounded-full transition"
                  style={{
                    fontFamily: "var(--font-body)",
                    border: sel
                      ? `1.4px solid ${c.color}`
                      : "1px solid rgba(255,255,255,0.10)",
                    background: sel ? `${c.color}22` : "rgba(255,255,255,0.045)",
                    color: sel ? "var(--app-text)" : "var(--app-text-secondary)",
                    backdropFilter: "blur(8px)",
                    boxShadow: sel ? `0 0 12px ${c.color}55` : "none",
                  }}
                >
                  <span
                    style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: c.color,
                      marginRight: 6,
                      verticalAlign: "middle",
                    }}
                  />
                  {zh ? c.labelZh : c.label}
                </button>
              );
            })}
          </div>
        </Accordion>

        <Accordion
          open={expandedStrength}
          onToggle={() => setExpandedStrength(!expandedStrength)}
          label={
            zh
              ? "今晚想慢慢喝，还是来点狠的？"
              : "Slow sip, or hit me?"
          }
        >
          <div className="pt-2">
            <SensoryControl
              value={sensory.strength}
              onChange={(v) => changeSensory("strength", v)}
              leftLabel={zh ? "慢慢喝" : "Slow sip"}
              rightLabel={zh ? "来点狠的" : "Hit me"}
              accent="var(--app-accent-vermouth)"
            />
          </div>
        </Accordion>

        <Accordion
          open={expandedAlcohol}
          onToggle={() => setExpandedAlcohol(!expandedAlcohol)}
          label={(() => {
            const opts = {
              low: { zh: "低酒精 / 微醺", en: "Low / light buzz" },
              standard: { zh: "标准酒精度", en: "Standard" },
              strong: { zh: "偏烈一点", en: "Strong" },
              zero: { zh: "无酒精也可以", en: "Zero-proof" },
            } as const;
            const chosen = opts[selectedAlcoholLevel];
            const isDefault = selectedAlcoholLevel === "standard" && !expandedAlcohol;
            if (isDefault) {
              return zh ? "我想自己选酒精度" : "Pick alcohol level";
            }
            return zh
              ? `酒精度：${chosen.zh}`
              : `Alcohol: ${chosen.en}`;
          })()}
        >
          <div className="pt-1 grid grid-cols-2 gap-2">
            {([
              { value: "low", zh: "低酒精 / 微醺", en: "Low / light buzz", descZh: "轻松一点，不想太上头", descEn: "Easy, not too heady" },
              { value: "standard", zh: "标准酒精度", en: "Standard", descZh: "正常来一杯，平衡就好", descEn: "Normal, balanced" },
              { value: "strong", zh: "偏烈一点", en: "Strong", descZh: "今天可以稍微有劲一点", descEn: "A little more punch" },
              { value: "zero", zh: "无酒精也可以", en: "Zero-proof", descZh: "只要氛围，不要酒精", descEn: "Vibe only, no alcohol" },
            ] as const).map((o) => {
              const sel = selectedAlcoholLevel === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setSelectedAlcoholLevel(o.value)}
                  className="flex flex-col gap-0.5 px-3 py-2 rounded-xl text-left text-xs"
                  style={{
                    fontFamily: "var(--font-body)",
                    border: sel
                      ? "1.4px solid var(--app-primary)"
                      : "1px solid rgba(255,255,255,0.10)",
                    background: sel
                      ? "rgba(153,185,198,0.15)"
                      : "rgba(255,255,255,0.045)",
                    color: sel ? "var(--app-text)" : "var(--app-text-secondary)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: 13 }}>
                    {zh ? o.zh : o.en}
                  </span>
                  <span style={{ color: "var(--app-text-muted)", fontSize: 10.5 }}>
                    {zh ? o.descZh : o.descEn}
                  </span>
                </button>
              );
            })}
          </div>
        </Accordion>

        <Accordion
          open={expandedSpirit}
          onToggle={() => setExpandedSpirit(!expandedSpirit)}
          label={
            baseSpirit
              ? zh
                ? `基酒：${BASE_SPIRITS.find((s) => s.key === baseSpirit)?.zh ?? ""}`
                : `Base spirit: ${BASE_SPIRITS.find((s) => s.key === baseSpirit)?.en ?? ""}`
              : zh
                ? "我有偏好基酒"
                : "I have a base spirit preference"
          }
        >

          <div className="pt-1 grid grid-cols-2 gap-2">
            {BASE_SPIRITS.map((s) => {
              const sel = baseSpirit === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setBaseSpirit(sel ? "" : s.key)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-left text-xs"
                  style={{
                    fontFamily: "var(--font-body)",
                    border: sel
                      ? `1.4px solid ${s.color}`
                      : "1px solid rgba(255,255,255,0.10)",
                    background: sel ? `${s.color}22` : "rgba(255,255,255,0.045)",
                    color: sel ? "var(--app-text)" : "var(--app-text-secondary)",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: s.color,
                      boxShadow: sel ? `0 0 6px ${s.color}` : "none",
                    }}
                  />
                  {zh ? s.zh : s.en}
                </button>
              );
            })}
          </div>
        </Accordion>

        <Accordion
          open={expandedRef}
          onToggle={() => setExpandedRef(!expandedRef)}
          label={
            referenceDrink
              ? `"${referenceDrink.length > 32 ? referenceDrink.slice(0, 32) + "…" : referenceDrink}"`
              : zh
                ? "我脑子里已经有一杯酒"
                : "I already have a drink in mind"
          }
        >
          <input
            type="text"
            value={referenceDrink}
            onChange={(e) => setReferenceDrink(e.target.value)}
            placeholder={zh ? "比如：像 Mojito，但不要那么甜" : "e.g. like a Mojito, but less sweet"}
            className="w-full mt-2 rounded-xl px-4 py-3 text-sm"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "var(--app-text)",
              fontFamily: "var(--font-heading)",
              fontStyle: "italic",
              outline: "none",
            }}
          />
        </Accordion>
      </div>

      {/* Sticky CTA */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 14px)",
          paddingTop: 12,
          background:
            "linear-gradient(180deg, rgba(20,22,25,0) 0%, rgba(20,22,25,0.72) 40%, rgba(20,22,25,0.95) 100%)",
        }}
      >
        <div className="mx-auto max-w-[520px] px-5">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onMix}
            disabled={isGenerating}
            className="w-full rounded-full py-4 text-sm font-semibold tracking-wider disabled:opacity-60"
            style={{
              fontFamily: "var(--font-heading)",
              color: "white",
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.08) 60%, rgba(255,255,255,0.18) 100%)",
              border: "1px solid rgba(255,255,255,0.22)",
              boxShadow:
                "0 12px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.16)",
            }}
          >
            {ctaLabel}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

// ── tiny local accordion ──
function Accordion({
  open,
  onToggle,
  label,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl"
      style={{
        background: "rgba(255,255,255,0.035)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-xs"
        style={{
          fontFamily: "var(--font-body)",
          color: "var(--app-text-secondary)",
        }}
      >
        <span className="text-left truncate pr-3">{label}</span>
        <motion.svg
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
