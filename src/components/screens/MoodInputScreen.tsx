
import { useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { encodeCocktailToHash, type Cocktail } from "@/lib/cocktails-store";
import { toast } from "sonner";
import { FLAVOR_CHIPS, MOOD_PLACEHOLDERS_EN, MOOD_PLACEHOLDERS_ZH, CUSTOM_FLAVOR_PLACEHOLDERS_EN, CUSTOM_FLAVOR_PLACEHOLDERS_ZH, VIBE_CHIPS } from "@/lib/moodtail-data";
import { VIBE_ROWS_EN, VIBE_ROWS_ZH } from "@/lib/vibe-cloud";
import { pickTashiRecipe } from "@/lib/tashi-recipes";
import { pickVibeExample } from "@/lib/vibe-examples";
import { useLang } from "@/lib/i18n";
import VibeBottle from "@/components/moodtail/VibeBottle";
import MixingOverlay from "@/components/moodtail/MixingOverlay";
import { track } from "@/lib/analytics";

const inkButtonStyle = {
  padding: "14px 24px",
  borderRadius: "4px",
  background: "linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.14) 100%)",
  color: "white" as const,
  boxShadow: "2px 3px 12px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.15)",
};

export default function MoodInputScreen({
  restaurantId,
  menuSlug,
}: { restaurantId?: string; menuSlug?: "dcp" } = {}) {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const isRestaurant = !!restaurantId || !!menuSlug;
  const restaurantParam = restaurantId ?? (menuSlug === "dcp" ? "double-chicken-please" : undefined);
  const [step, setStep] = useState<1 | 2>(1);
  const [mood, setMood] = useState("");
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [baseSpirit, setBaseSpirit] = useState<string>("");
  const [spiritOpen, setSpiritOpen] = useState(false);
  const [customPreference, setCustomPreference] = useState("");
  const [drinkLength, setDrinkLength] = useState<"" | "long" | "short">("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [customInputStarted, setCustomInputStarted] = useState(false);
  const [intensity, setIntensity] = useState(60);

  // Morandi mood palette — from calm cool to warm bold, drives bottle color on drag.
  const MOOD_PALETTE = ["#99B9C6", "#A9B4A1", "#D8D3C9", "#B7A9B3", "#DAC5C3"];



  const BASE_SPIRITS: { key: string; en: string; zh: string; color: string; flavorEn: string; flavorZh: string }[] = [
    { key: "gin", en: "Gin", zh: "金酒", color: "#7fb069", flavorEn: "Crisp, herbal, juniper-forward", flavorZh: "清冽草本，杜松子香气" },
    { key: "vodka", en: "Vodka", zh: "伏特加", color: "#a3b8c4", flavorEn: "Neutral, clean, lets mixers shine", flavorZh: "中性纯净，凸显其他风味" },
    { key: "rum", en: "Rum", zh: "朗姆", color: "#c08457", flavorEn: "Sweet, tropical, molasses warmth", flavorZh: "甜润热带，蔗糖暖意" },
    { key: "tequila", en: "Tequila", zh: "龙舌兰", color: "#e0b96b", flavorEn: "Earthy agave, peppery, bright", flavorZh: "龙舌兰土香，胡椒明亮" },
    { key: "whiskey", en: "Whiskey", zh: "威士忌", color: "#a0522d", flavorEn: "Oaky, smoky, caramel depth", flavorZh: "橡木烟熏，焦糖醇厚" },
    { key: "mezcal", en: "Mezcal", zh: "梅斯卡尔", color: "#8b6f4e", flavorEn: "Smoky, mineral, wild agave", flavorZh: "浓郁烟熏，矿物野性" },
    { key: "brandy", en: "Brandy", zh: "白兰地", color: "#b8602e", flavorEn: "Fruity, velvety, oak-aged", flavorZh: "果香丝滑，橡木陈年" },
    { key: "sake", en: "Sake", zh: "清酒", color: "#e8dcc4", flavorEn: "Delicate, rice-sweet, umami", flavorZh: "清雅米香，鲜甜柔和" },
    { key: "tashi", en: "Tashi", zh: "Tashi 青稞酒", color: "#c9a84c", flavorEn: "Highland barley, mellow and sweet, plateau grain", flavorZh: "青稞清香，柔和甘甜，高原谷物" },
    { key: "nonalcoholic", en: "No alcohol", zh: "无酒精", color: "#d4a5c4", flavorEn: "Fresh, fruity mocktail", flavorZh: "清爽果香无酒精" },
  ];
  const photoIngredients: string[] | null = null;

  const moodPlaceholders = lang === "zh" ? MOOD_PLACEHOLDERS_ZH : MOOD_PLACEHOLDERS_EN;
  const customPlaceholders = lang === "zh" ? CUSTOM_FLAVOR_PLACEHOLDERS_ZH : CUSTOM_FLAVOR_PLACEHOLDERS_EN;

  const randomMoodIdx = useRef(Math.floor(Math.random() * 8));
  const randomCustomIdx = useRef(Math.floor(Math.random() * 6));
  const moodPlaceholder = moodPlaceholders[randomMoodIdx.current % moodPlaceholders.length];
  const customPlaceholder = customPlaceholders[randomCustomIdx.current % customPlaceholders.length];

  // Derive the bottle color from current selections (cloud row → mood chip → spirit → flavor → primary).
  const currentVibeColor = (() => {
    const rows = lang === "zh" ? VIBE_ROWS_ZH : VIBE_ROWS_EN;
    const row = rows.find((r) => r.labels.includes(mood));
    if (row) return row.color;
    const chip = VIBE_CHIPS.find(
      (c) => c.label === mood || c.labelEn === mood,
    );
    if (chip) return chip.color;
    const spirit = BASE_SPIRITS.find((s) => s.key === baseSpirit);
    if (spirit) return spirit.color;
    const flavor = FLAVOR_CHIPS.find((f) => selectedFlavors.includes(f.label));
    if (flavor?.color) return flavor.color;
    return "#E0533C";
  })();

  const mixingLines = lang === "zh"
    ? [
        "正在捕捉你的当下味道…",
        "正在调和你的情绪基酒…",
        "加入一点不理智的香气…",
        "摇匀一份只属于你的 vibe…",
      ]
    : [
        "Capturing your current flavor…",
        "Blending your emotional base spirit…",
        "Adding a dash of unreason…",
        "Shaking up a vibe just for you…",
      ];

  const goNext = () => {
    if (!mood.trim()) { toast.error(lang === "zh" ? "先描述一下你的状态吧！" : "Describe your vibe first!"); return; }
    if (selectedTag) {
      // tag path — nothing extra to track beyond the earlier vibe_tag_selected
    } else {
      track("vibe_custom_input_submitted", { custom_text_length: mood.trim().length });
    }
    if (!selectedTag && !customInputStarted) {
      track("vibe_selection_skipped");
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStep((s) => (s > 1 ? ((s - 1) as 1 | 2) : 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };



  const toggleFlavor = (label: string) => {
    setSelectedFlavors((prev) => {
      const next = prev.includes(label) ? prev.filter((f) => f !== label) : [...prev, label];
      if (!prev.includes(label)) track("flavor_selected", { selected_flavor: label });
      return next;
    });
  };

  const handleMix = async () => {
    setIsGenerating(true);
    if (selectedFlavors.length === 0) track("flavor_skipped");
    try {
      const spiritObj = BASE_SPIRITS.find((s) => s.key === baseSpirit);
      const spiritNote = spiritObj
        ? (lang === "zh" ? `基酒：${spiritObj.zh}。` : `Base spirit: ${spiritObj.en}. `)
        : "";
      const lengthNote = drinkLength === "long"
        ? (lang === "zh" ? "杯型：长饮（高杯，加冰，含较多 mixer，慢慢享用）。" : "Format: Long drink (tall glass, plenty of ice and mixer, sippable). ")
        : drinkLength === "short"
        ? (lang === "zh" ? "杯型：短饮（小杯，烈酒为主，少 mixer，浓郁集中）。" : "Format: Short drink (small glass, spirit-forward, minimal mixer, concentrated). ")
        : "";
      const mergedPreference = (spiritNote + lengthNote + (customPreference || "")).trim();


      // When the user picks Tashi, pick one of the brand's signature recipes
      // as a creative reference and attach its brand illustration to the card.
      const tashiPick = baseSpirit === "tashi"
        ? pickTashiRecipe({ selectedFlavors, mood })
        : null;
      const tashiReference = tashiPick
        ? {
            name: tashiPick.name,
            vibe: tashiPick.vibe,
            ingredients: tashiPick.ingredients,
            recipe: tashiPick.recipe,
          }
        : null;

      // Chinese mode → always attach a handwritten-menu style reference so
      // the AI mimics the witty, abstract bistro-menu tone. Matching now
      // weighs mood + scene + flavor chips + base spirit + drink length.
      const vibePick = lang === "zh"
        ? pickVibeExample(mood, {
            selectedFlavors,
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

      const endpoint = menuSlug === "dcp" ? "/api/match-dcp-cocktail" : "/api/generate-cocktail";
      const body = menuSlug === "dcp"
        ? JSON.stringify({ mood, selectedFlavors, customPreference: mergedPreference, lang })
        : JSON.stringify({ mood, selectedFlavors, customPreference: mergedPreference, photoIngredients, lang, tashiReference, vibeReference });
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      if (!res.ok) {
        if (res.status === 402) {
          toast.error(lang === "zh" ? "AI 额度不足，请稍后再试或为工作区充值。" : "AI credits exhausted. Please top up your workspace.");
        } else if (res.status === 429) {
          toast.error(lang === "zh" ? "请求太频繁，请稍等片刻再试。" : "Too many requests. Please slow down and retry.");
        } else {
          toast.error(lang === "zh" ? "AI 调制失败，请重试。" : "AI couldn't mix this. Please retry.");
        }
        setIsGenerating(false);
        return;
      }
      const generated = await res.json();
      const cocktail: Cocktail = {
        id: 0,
        cocktailName: generated.cocktailName,
        originalMood: mood,
        selectedFlavors,
        customPreference,
        flavorProfile: generated.flavorProfile,
        tastesLike: generated.tastesLike,
        ingredients: generated.ingredients,
        recipe: generated.recipe,
        roast: generated.roast,
        category: generated.category,
        imageData: null,
        imageUrl: null,
        lang,
        createdAt: new Date().toISOString(),
        userId: null,
        matchedFromMenu: !!generated.matchedFromMenu,
        restaurantName: generated.restaurantName ?? null,
        menuSection: generated.menuSection ?? null,
        menuPrice: generated.menuPrice ?? null,
        whyThisMatch: generated.whyThisMatch ?? null,
        menuItemName: generated.menuItemName ?? null,

      };
      const encoded = encodeCocktailToHash(cocktail);
      track("cocktail_generated", {
        cocktail_name: generated.cocktailName,
        selected_tag: selectedTag,
        selected_flavor: selectedFlavors,
        custom_text_length: mood.trim().length,
        menu_source: menuSlug ?? null,
        matched_from_menu: !!menuSlug,
      });
      navigate({
        to: "/drinks/$id",
        params: { id: "preview" },
        search: { d: encoded, ...(restaurantParam ? { restaurant: restaurantParam } : {}) },
      });
    } catch {
      toast.error(lang === "zh" ? "无法读取你的 vibe，请重试！" : "Couldn't read your vibe. Try again!");
      setIsGenerating(false);
    }
  };


  return (
    <div
      className="w-full md:max-w-2xl lg:max-w-3xl md:mx-auto min-h-svh"
      style={{ background: "transparent" }}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        {isRestaurant && step === 1 ? (
          <span className="w-4" />
        ) : (
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={step === 1 ? () => navigate({ to: "/" }) : goBack}
            className="flex items-center gap-1.5 text-xs"
            style={{ color: "var(--app-text-secondary)" }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M15.75 19.5L8.25 12l7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[10px] tracking-wider" style={{ fontFamily: "var(--font-body)" }}>
              {step === 1 ? t("mood.exit") : t("mood.back")}
            </span>
          </motion.button>
        )}

        <div className="flex items-center gap-2">
          {[1, 2].map((s) => (
            <div key={s} className="transition-all duration-300" style={{
              width: step === s ? 20 : 6, height: 6, borderRadius: 3,
              backgroundColor: step === s ? "var(--app-primary)" : "rgba(255,255,255,0.12)",
            }} />
          ))}
        </div>

        <div className="text-[10px] tracking-wider" style={{ fontFamily: "var(--font-body)", color: "var(--app-text-muted)" }}>
          {step === 1 ? t("mood.step1") : t("mood.step2")}
        </div>
      </div>

      {/* ── 自然滚动内容区，按钮在内容末尾，不固定底部 ── */}
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="px-5 pb-28 space-y-5"
          >
            {/* Hero bottle — reflects current vibe */}
            <div className="flex justify-center pt-2 pb-1">
              <VibeBottle
                color={currentVibeColor}
                size={180}
                mode="idle"
                sliderVal={intensity}
                onSliderValChange={setIntensity}
                colorStops={MOOD_PALETTE}
              />

            </div>

            <div className="text-center">
              <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)" }}>
                {t("mood.title")}
              </h1>
              <p className="text-sm mt-1" style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", color: "var(--app-text-secondary)" }}>
                {t("mood.subtitle")}
              </p>
            </div>

            {/* Vibe cloud — multiple drifting rows, one per hidden category */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2"
                style={{ fontFamily: "var(--font-body)", color: "var(--app-text-muted)" }}>
                {t("mood.chips.label")}
              </label>
              <div
                className="relative overflow-hidden space-y-2 py-1"
                style={{
                  maskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
                  WebkitMaskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
                }}
              >
                {(lang === "zh" ? VIBE_ROWS_ZH : VIBE_ROWS_EN).map((row, rowIdx) => {
                  const hasSelectedInRow = row.labels.includes(mood);
                  // Slower for longer rows so speed feels consistent.
                  const duration = Math.max(48, row.labels.length * 2.2);
                  const from = row.dir === "ltr" ? "-50%" : "0%";
                  const to = row.dir === "ltr" ? "0%" : "-50%";
                  return (
                    <div key={rowIdx} className="relative overflow-hidden">
                      <motion.div
                        className="flex gap-2 w-max"
                        animate={hasSelectedInRow ? { x: from } : { x: [from, to] }}
                        transition={
                          hasSelectedInRow
                            ? { duration: 0 }
                            : { duration, ease: "linear", repeat: Infinity }
                        }
                        style={{ willChange: "transform" }}
                      >
                        {[...row.labels, ...row.labels].map((label, idx) => {
                          const isSelected = mood === label;
                          const floatDelay = (idx % row.labels.length) * 0.28 + rowIdx * 0.15;
                          const floatDur = 5 + ((idx * 7) % 5) * 0.6;
                          return (
                            <motion.button
                              key={`${rowIdx}-${label}-${idx}`}
                              whileTap={{ scale: 0.9 }}
                              animate={{ y: [0, -4, 0, 3, 0] }}
                              transition={{ duration: floatDur, delay: floatDelay, repeat: Infinity, ease: "easeInOut" }}
                              onClick={() => {
                                if (isSelected) {
                                  setMood("");
                                  setSelectedTag(null);
                                } else {
                                  setMood(label);
                                  setSelectedTag(label);
                                  setCustomInputStarted(false);
                                  track("vibe_tag_selected", { selected_tag: label });
                                }
                              }}
                              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap"
                              style={{
                                border: isSelected ? `1.5px solid ${row.color}` : "1px solid rgba(255,255,255,0.12)",
                                backgroundColor: isSelected ? `${row.color}22` : "rgba(255,255,255,0.05)",
                                backdropFilter: "blur(6px)",
                                color: isSelected ? "var(--app-text)" : "var(--app-text-secondary)",
                                fontWeight: isSelected ? 600 : 400,
                                boxShadow: isSelected ? `0 0 0 3px ${row.color}22, 0 0 18px ${row.color}44` : "none",
                              }}
                            >
                              <span className="flex-shrink-0 rounded-full" style={{
                                width: 7, height: 7,
                                backgroundColor: row.color,
                                opacity: isSelected ? 1 : 0.7,
                                boxShadow: isSelected ? `0 0 4px ${row.color}88` : "none",
                              }} />
                              {label}
                            </motion.button>
                          );
                        })}
                      </motion.div>
                    </div>
                  );
                })}
              </div>
            </div>



            {/* Divider */}
            <div className="flex items-center gap-3">
              <span className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
              <span className="text-[10px] tracking-wider" style={{ color: "var(--app-text-muted)", fontFamily: "var(--font-body)" }}>{t("mood.divider")}</span>
              <span className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
            </div>

            {/* Textarea */}
            <div className="relative">
              <textarea
                value={mood}
                onChange={(e) => {
                  const v = e.target.value;
                  setMood(v);
                  if (v && !customInputStarted && !selectedTag) {
                    setCustomInputStarted(true);
                    track("vibe_custom_input_started");
                  }
                  if (selectedTag && v !== selectedTag) setSelectedTag(null);
                }}
                className="w-full rounded-xl p-4 resize-none leading-relaxed"
                style={{
                  minHeight: 96, fontSize: 16,
                  backgroundColor: "rgba(255,255,255,0.05)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "var(--app-text)",
                  fontFamily: "var(--font-heading)", fontStyle: "italic",
                  outline: "none",
                }}
                placeholder={`"${moodPlaceholder}"`}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--app-primary)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
              />
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setMood(moodPlaceholder)}
                className="absolute right-3 bottom-3 text-[10px] opacity-70 hover:opacity-100"
                style={{ fontFamily: "var(--font-body)", color: "var(--app-primary)" }}
              >
                {t("mood.surprise")}
              </motion.button>
            </div>

            {/* CTA — 内容末尾，随页面滚动 */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={goNext}
              disabled={!mood.trim()}
              className="w-full relative flex items-center justify-center gap-2 text-sm font-semibold tracking-wider overflow-hidden disabled:opacity-40"
              style={inkButtonStyle}
            >
              <span className="absolute top-0 left-4 right-4 h-px pointer-events-none" style={{ background: "rgba(255,255,255,0.3)" }} />
              <span className="relative z-10 flex items-center gap-2">
                {t("mood.next")}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </motion.button>
          </motion.div>
        ) : step === 2 ? (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="px-5 pb-28 space-y-5"
          >
            <div>
              <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)" }}>
                {t("flavor.title")}
              </h1>
              <p className="text-sm mt-1" style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", color: "var(--app-text-secondary)" }}>
                {t("flavor.subtitle")}
              </p>
            </div>

            {/* Vibe preview pill */}
            <div className="flex items-start gap-2 p-3 rounded-xl"
              style={{ background: "rgba(0,0,0,0.45)", border: "1px solid rgba(0,0,0,0.45)" }}>
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="var(--app-primary)" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M12 3v18M8 22h8M4 6c0 4.418 3.582 8 8 8s8-3.582 8-8V4H4v2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-xs leading-relaxed" style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", color: "var(--app-text-secondary)" }}>
                "{mood.length > 80 ? mood.slice(0, 80) + "…" : mood}"
              </p>
            </div>

            {/* Flavor chips */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2"
                style={{ fontFamily: "var(--font-body)", color: "var(--app-text-muted)" }}>
                {t("flavor.chips.label")}
              </label>
              <div className="flex flex-wrap gap-2">
                {FLAVOR_CHIPS.map((chip) => {
                  const isSelected = selectedFlavors.includes(chip.label);
                  return (
                    <motion.button
                      key={chip.label}
                      whileTap={{ scale: 0.88 }}
                      onClick={() => toggleFlavor(chip.label)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                      style={{
                        border: isSelected ? `1.5px solid ${chip.color}` : "1px solid rgba(255,255,255,0.12)",
                        backgroundColor: isSelected ? `${chip.color}18` : "rgba(255,255,255,0.05)",
                        backdropFilter: "blur(6px)",
                        color: isSelected ? "var(--app-text)" : "var(--app-text-secondary)",
                        fontWeight: isSelected ? 600 : 400,
                        boxShadow: isSelected ? `0 0 0 3px ${chip.color}22` : "none",
                      }}
                    >
                      <span className="flex-shrink-0 rounded-full" style={{
                        width: 7, height: 7,
                        backgroundColor: chip.color,
                        opacity: isSelected ? 1 : 0.7,
                        boxShadow: isSelected ? `0 0 4px ${chip.color}88` : "none",
                      }} />
                      {lang === "zh" ? chip.labelZh : chip.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Base spirit dropdown */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2"
                style={{ fontFamily: "var(--font-body)", color: "var(--app-text-muted)" }}>
                {lang === "zh" ? "基酒（可选）" : "Base spirit (optional)"}
              </label>
              {(() => {
                const selected = BASE_SPIRITS.find((s) => s.key === baseSpirit);
                return (
                  <div className="relative">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSpiritOpen((v) => !v)}
                      className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm transition-all"
                      style={{
                        backgroundColor: "rgba(255,255,255,0.05)",
                        backdropFilter: "blur(8px)",
                        border: selected ? `1.5px solid ${selected.color}` : "1px solid rgba(255,255,255,0.12)",
                        color: "var(--app-text)",
                        boxShadow: selected ? `0 0 0 3px ${selected.color}22` : "none",
                      }}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="flex-shrink-0 rounded-full" style={{
                          width: 9, height: 9,
                          backgroundColor: selected?.color ?? "rgba(255,255,255,0.12)",
                          boxShadow: selected ? `0 0 4px ${selected.color}88` : "none",
                        }} />
                        <span className="flex flex-col items-start min-w-0">
                          <span className="font-medium truncate" style={{ color: selected ? "var(--app-text)" : "var(--app-text-muted)" }}>
                            {selected ? (lang === "zh" ? selected.zh : selected.en) : (lang === "zh" ? "选择基酒（可选）" : "Pick a base spirit (optional)")}
                          </span>
                          {selected && (
                            <span className="text-[10px] truncate" style={{ fontFamily: "var(--font-body)", color: "var(--app-text-muted)" }}>
                              {lang === "zh" ? selected.flavorZh : selected.flavorEn}
                            </span>
                          )}
                        </span>
                      </span>
                      <svg className="w-4 h-4 flex-shrink-0 transition-transform" style={{ transform: spiritOpen ? "rotate(180deg)" : "rotate(0)", color: "var(--app-text-muted)" }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.button>

                    <AnimatePresence>
                      {spiritOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute z-20 mt-1.5 w-full rounded-xl overflow-hidden max-h-80 overflow-y-auto"
                          style={{
                            backgroundColor: "rgba(24,28,34,0.95)",
                            backdropFilter: "blur(12px)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                          }}
                        >
                          {BASE_SPIRITS.map((s) => {
                            const isSelected = baseSpirit === s.key;
                            return (
                              <button
                                key={s.key}
                                type="button"
                                onClick={() => { setBaseSpirit(isSelected ? "" : s.key); setSpiritOpen(false); }}
                                className="w-full flex items-start gap-2.5 px-4 py-2.5 text-left transition-colors hover:bg-black/5"
                                style={{ backgroundColor: isSelected ? `${s.color}18` : "transparent" }}
                              >
                                <span className="flex-shrink-0 rounded-full mt-1.5" style={{
                                  width: 9, height: 9,
                                  backgroundColor: s.color,
                                  boxShadow: isSelected ? `0 0 4px ${s.color}88` : "none",
                                }} />
                                <span className="flex flex-col min-w-0">
                                  <span className="text-sm font-medium" style={{ color: "var(--app-text)" }}>
                                    {lang === "zh" ? s.zh : s.en}
                                  </span>
                                  <span className="text-[11px] leading-tight" style={{ fontFamily: "var(--font-body)", color: "var(--app-text-muted)" }}>
                                    {lang === "zh" ? s.flavorZh : s.flavorEn}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}
            </div>


            {/* Long vs Short drink */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2"
                style={{ fontFamily: "var(--font-body)", color: "var(--app-text-muted)" }}>
                {lang === "zh" ? "杯型（可选）" : "Drink format (optional)"}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: "long", en: "Long drink", zh: "长饮", descEn: "Tall, icy, sippable", descZh: "高杯加冰，慢慢享用" },
                  { key: "short", en: "Short drink", zh: "短饮", descEn: "Small, spirit-forward", descZh: "小杯，烈酒为主" },
                ] as const).map((opt) => {
                  const isSelected = drinkLength === opt.key;
                  return (
                    <motion.button
                      key={opt.key}
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setDrinkLength(isSelected ? "" : opt.key)}
                      className="flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl text-left transition-all"
                      style={{
                        border: isSelected ? "1.5px solid var(--app-primary)" : "1px solid rgba(255,255,255,0.12)",
                        backgroundColor: isSelected ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.05)",
                        backdropFilter: "blur(8px)",
                        boxShadow: isSelected ? "0 0 0 3px rgba(0,0,0,0.45)" : "none",
                      }}
                    >
                      <span className="text-sm font-medium" style={{ color: "var(--app-text)" }}>
                        {lang === "zh" ? opt.zh : opt.en}
                      </span>
                      <span className="text-[10px]" style={{ fontFamily: "var(--font-body)", color: "var(--app-text-muted)" }}>
                        {lang === "zh" ? opt.descZh : opt.descEn}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Custom preference */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2"

                style={{ fontFamily: "var(--font-body)", color: "var(--app-text-muted)" }}>
                {t("flavor.custom.label")}
              </label>
              <input
                value={customPreference}
                onChange={(e) => setCustomPreference(e.target.value)}
                type="text"
                className="w-full rounded-xl px-4 py-3 text-sm"
                style={{
                  backgroundColor: "rgba(255,255,255,0.05)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "var(--app-text)", outline: "none",
                }}
                placeholder={customPlaceholder}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--app-primary)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
              />
            </div>

            {/* CTA — 内容末尾，随页面滚动 */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleMix}
              disabled={isGenerating}
              className="w-full relative flex items-center justify-center gap-2 text-sm font-semibold tracking-wider overflow-hidden disabled:opacity-50"
              style={inkButtonStyle}
            >
              <span className="absolute top-0 left-4 right-4 h-px pointer-events-none" style={{ background: "rgba(255,255,255,0.3)" }} />
              <span className="relative z-10 flex items-center gap-2">
                {isGenerating ? t("flavor.loading") : (lang === "zh" ? "调制我的酒" : "Mix My Drink")}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </motion.button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <MixingOverlay open={isGenerating} color={currentVibeColor} lines={mixingLines} />
    </div>
  );
}
