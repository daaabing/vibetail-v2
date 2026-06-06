
import { useState, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { createCocktail } from "@/lib/cocktails-store";
import { toast } from "sonner";
import { FLAVOR_CHIPS, MOOD_PLACEHOLDERS_EN, MOOD_PLACEHOLDERS_ZH, CUSTOM_FLAVOR_PLACEHOLDERS_EN, CUSTOM_FLAVOR_PLACEHOLDERS_ZH, VIBE_CHIPS } from "@/lib/moodtail-data";
import { pickTashiRecipe } from "@/lib/tashi-recipes";
import { useLang } from "@/lib/i18n";

const inkButtonStyle = {
  padding: "14px 24px",
  borderRadius: "4px",
  background: "linear-gradient(135deg, #C2410C 0%, #E0533C 50%, #C2410C 100%)",
  color: "white" as const,
  boxShadow: "2px 3px 12px rgba(194,65,12,0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
};

export default function MoodInputScreen() {
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [mood, setMood] = useState("");
  const [selectedFlavors, setSelectedFlavors] = useState<string[]>([]);
  const [baseSpirit, setBaseSpirit] = useState<string>("");
  const [spiritOpen, setSpiritOpen] = useState(false);
  const [customPreference, setCustomPreference] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

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
  // Step 3 — photo ingredients
  const [photoIngredients, setPhotoIngredients] = useState<string[] | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [photoInvalid, setPhotoInvalid] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const moodPlaceholders = lang === "zh" ? MOOD_PLACEHOLDERS_ZH : MOOD_PLACEHOLDERS_EN;
  const customPlaceholders = lang === "zh" ? CUSTOM_FLAVOR_PLACEHOLDERS_ZH : CUSTOM_FLAVOR_PLACEHOLDERS_EN;

  const randomMoodIdx = useRef(Math.floor(Math.random() * 8));
  const randomCustomIdx = useRef(Math.floor(Math.random() * 6));
  const moodPlaceholder = moodPlaceholders[randomMoodIdx.current % moodPlaceholders.length];
  const customPlaceholder = customPlaceholders[randomCustomIdx.current % customPlaceholders.length];

  const goNext = () => {
    if (!mood.trim()) { toast.error(lang === "zh" ? "先描述一下你的状态吧！" : "Describe your vibe first!"); return; }
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToStep3 = () => {
    setStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStep((s) => (s > 1 ? (s - 1) as 1 | 2 | 3 : 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePhotoUpload = (file: File) => {
    setPhotoInvalid(false);
    setPhotoIngredients(null);
    setPhotoPreview(URL.createObjectURL(file));
    // No backend ingredient analysis in this build — accept the photo as-is.
    setIsAnalyzing(false);
  };


  const toggleFlavor = (label: string) => {
    setSelectedFlavors((prev) =>
      prev.includes(label) ? prev.filter((f) => f !== label) : [...prev, label]
    );
  };

  const handleMix = async () => {
    setIsGenerating(true);
    try {
      const spiritObj = BASE_SPIRITS.find((s) => s.key === baseSpirit);
      const spiritNote = spiritObj
        ? (lang === "zh" ? `基酒：${spiritObj.zh}。` : `Base spirit: ${spiritObj.en}. `)
        : "";
      const mergedPreference = (spiritNote + (customPreference || "")).trim();

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

      const res = await fetch("/api/generate-cocktail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, selectedFlavors, customPreference: mergedPreference, photoIngredients, lang, tashiReference }),
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
      const data = createCocktail({
        mood,
        selectedFlavors,
        customPreference,
        photoIngredients,
        generated,
        imageUrl: tashiPick?.imageUrl ?? null,
        lang,
      });
      navigate({ to: "/result/$id", params: { id: String(data.id) } });
    } catch {
      toast.error(lang === "zh" ? "无法读取你的 vibe，请重试！" : "Couldn't read your vibe. Try again!");
      setIsGenerating(false);
    }
  };


  return (
    <div
      className="w-full md:max-w-2xl lg:max-w-3xl md:mx-auto min-h-svh"
      style={{ background: "linear-gradient(170deg, #fdf8f3 0%, #faf4ed 60%, #f8f0e8 100%)" }}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
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

        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="transition-all duration-300" style={{
              width: step === s ? 20 : 6, height: 6, borderRadius: 3,
              backgroundColor: step === s ? "var(--app-primary)" : "var(--app-border)",
            }} />
          ))}
        </div>

        <div className="text-[10px] tracking-wider" style={{ fontFamily: "var(--font-body)", color: "var(--app-text-muted)" }}>
          {step === 1 ? t("mood.step1") : step === 2 ? t("mood.step2") : t("ingredients.step")}
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
            <div>
              <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)" }}>
                {t("mood.title")}
              </h1>
              <p className="text-sm mt-1" style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", color: "var(--app-text-secondary)" }}>
                {t("mood.subtitle")}
              </p>
            </div>

            {/* Vibe chips */}
            <div>
              <label className="text-[10px] font-semibold uppercase tracking-wider block mb-2"
                style={{ fontFamily: "var(--font-body)", color: "var(--app-text-muted)" }}>
                {t("mood.chips.label")}
              </label>
              <div className="flex flex-wrap gap-2">
                {VIBE_CHIPS.map((chip) => {
                  const displayLabel = lang === "zh" ? chip.label : (chip.labelEn ?? chip.label);
                  const isSelected = mood === displayLabel;

                  return (
                    <motion.button
                      key={chip.labelEn ?? chip.label}
                      whileTap={{ scale: 0.88 }}
                      onClick={() => setMood(isSelected ? "" : displayLabel)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                      style={{
                        border: isSelected ? `1.5px solid ${chip.color}` : "1px solid var(--app-border)",
                        backgroundColor: isSelected ? `${chip.color}18` : "rgba(255,255,255,0.65)",
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
                      {displayLabel}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <span className="flex-1 h-px" style={{ background: "var(--app-border)" }} />
              <span className="text-[10px] tracking-wider" style={{ color: "var(--app-text-muted)", fontFamily: "var(--font-body)" }}>{t("mood.divider")}</span>
              <span className="flex-1 h-px" style={{ background: "var(--app-border)" }} />
            </div>

            {/* Textarea */}
            <div className="relative">
              <textarea
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                className="w-full rounded-xl p-4 resize-none leading-relaxed"
                style={{
                  minHeight: 96, fontSize: 16,
                  backgroundColor: "rgba(255,255,255,0.75)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid var(--app-border)",
                  color: "var(--app-text)",
                  fontFamily: "var(--font-heading)", fontStyle: "italic",
                  outline: "none",
                }}
                placeholder={`"${moodPlaceholder}"`}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--app-primary)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--app-border)"; }}
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
              <span className="absolute inset-0 pointer-events-none" style={{
                background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.18) 55%, transparent 75%)",
                animation: "liquid-flow 3s ease-in-out infinite",
              }} />
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
              style={{ background: "rgba(224,83,60,0.07)", border: "1px solid rgba(224,83,60,0.2)" }}>
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
                        border: isSelected ? `1.5px solid ${chip.color}` : "1px solid var(--app-border)",
                        backgroundColor: isSelected ? `${chip.color}18` : "rgba(255,255,255,0.6)",
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
                        backgroundColor: "rgba(255,255,255,0.7)",
                        backdropFilter: "blur(8px)",
                        border: selected ? `1.5px solid ${selected.color}` : "1px solid var(--app-border)",
                        color: "var(--app-text)",
                        boxShadow: selected ? `0 0 0 3px ${selected.color}22` : "none",
                      }}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="flex-shrink-0 rounded-full" style={{
                          width: 9, height: 9,
                          backgroundColor: selected?.color ?? "var(--app-border)",
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
                            backgroundColor: "rgba(255,253,250,0.98)",
                            backdropFilter: "blur(12px)",
                            border: "1px solid var(--app-border)",
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
                  backgroundColor: "rgba(255,255,255,0.7)",
                  backdropFilter: "blur(8px)",
                  border: "1px solid var(--app-border)",
                  color: "var(--app-text)", outline: "none",
                }}
                placeholder={customPlaceholder}
                onFocus={(e) => { e.currentTarget.style.borderColor = "var(--app-primary)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--app-border)"; }}
              />
            </div>

            {/* CTA — 内容末尾，随页面滚动 */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={goToStep3}
              disabled={false}
              className="w-full relative flex items-center justify-center gap-2 text-sm font-semibold tracking-wider overflow-hidden"
              style={inkButtonStyle}
            >
              <span className="absolute inset-0 pointer-events-none" style={{
                background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.18) 55%, transparent 75%)",
                animation: "liquid-flow 3s ease-in-out infinite",
              }} />
              <span className="absolute top-0 left-4 right-4 h-px pointer-events-none" style={{ background: "rgba(255,255,255,0.3)" }} />
              <span className="relative z-10 flex items-center gap-2">
                {lang === "zh" ? "下一步 — 上传食材" : "Next — Add Ingredients"}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </motion.button>
          </motion.div>
        ) : (
          /* ── Step 3: What's in your fridge? ── */
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            className="px-5 pb-28 space-y-5"
          >
            {/* Title */}
            <div>
              <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)", color: "var(--app-text)" }}>
                {t("ingredients.title")}
              </h1>
              <p className="text-sm mt-1" style={{ fontFamily: "var(--font-heading)", fontStyle: "italic", color: "var(--app-text-secondary)" }}>
                {t("ingredients.subtitle")}
              </p>
            </div>

            {/* Invalid message */}
            {photoInvalid && (
              <div className="p-3 rounded-xl text-xs leading-relaxed"
                style={{ background: "rgba(194,65,12,0.07)", border: "1px solid rgba(194,65,12,0.2)", color: "var(--app-text-secondary)" }}>
                {t("ingredients.invalid")}
              </div>
            )}

            {/* Photo preview + detected ingredients */}
            {photoPreview && !isAnalyzing && photoIngredients && (
              <div className="space-y-3">
                <img src={photoPreview} alt="Cocktail ingredients preview from uploaded photo" className="w-full rounded-xl object-cover" style={{ maxHeight: 200 }} />
                <div className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid var(--app-border)" }}>
                  <p className="text-[10px] uppercase tracking-wider mb-2" style={{ fontFamily: "var(--font-body)", color: "var(--app-text-muted)" }}>
                    {t("ingredients.detected")}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {photoIngredients.map((ing) => (
                      <span key={ing} className="px-2.5 py-1 rounded-full text-xs"
                        style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "var(--app-text)" }}>
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Analyzing spinner */}
            {isAnalyzing && (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                  <svg className="w-7 h-7" fill="none" stroke="var(--app-primary)" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path d="M12 3v18M8 22h8M4 6c0 4.418 3.582 8 8 8s8-3.582 8-8V4H4v2z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.div>
                <p className="text-xs" style={{ color: "var(--app-text-muted)", fontFamily: "var(--font-body)" }}>
                  {t("ingredients.analyzing")}
                </p>
              </div>
            )}

            {/* Hidden inputs — 上传文件 + 拍照分开 */}
            {/* Single file input — 系统弹出相册/文件选择器，移动端自带"拍照/相册"选项 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); e.target.value = ""; }}
            />

            {/* CTA buttons */}
            <div className="space-y-2.5">
              {/* If ingredients detected → primary CTA is "Mix with these" */}
              {photoIngredients && !isAnalyzing ? (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleMix}
                  disabled={isGenerating}
                  className="w-full relative flex items-center justify-center gap-2 text-sm font-semibold tracking-wider overflow-hidden disabled:opacity-50"
                  style={inkButtonStyle}
                >
                  <span className="absolute inset-0 pointer-events-none" style={{
                    background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.18) 55%, transparent 75%)",
                    animation: "liquid-flow 3s ease-in-out infinite",
                  }} />
                  <span className="absolute top-0 left-4 right-4 h-px pointer-events-none" style={{ background: "rgba(255,255,255,0.3)" }} />
                  <span className="relative z-10">{isGenerating ? t("flavor.loading") : t("ingredients.detected.continue")}</span>
                </motion.button>
              ) : (
                /* 上传 + 拍照 两个并排按钮 */
                <div className="grid grid-cols-2 gap-2">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAnalyzing}
                    className="relative flex items-center justify-center gap-2 text-sm font-semibold tracking-wider overflow-hidden disabled:opacity-50 py-3 px-4"
                    style={inkButtonStyle}
                  >
                    <span className="absolute inset-0 pointer-events-none" style={{
                      background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.18) 55%, transparent 75%)",
                      animation: "liquid-flow 3s ease-in-out infinite",
                    }} />
                    <span className="absolute top-0 left-4 right-4 h-px pointer-events-none" style={{ background: "rgba(255,255,255,0.3)" }} />
                    <svg className="w-4 h-4 relative z-10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="relative z-10 text-xs">{lang === "zh" ? "上传图片" : "Upload Photo"}</span>
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isAnalyzing}

                    className="relative flex items-center justify-center gap-2 text-sm font-semibold tracking-wider overflow-hidden disabled:opacity-50 py-3 px-4"
                    style={{
                      borderRadius: "4px",
                      background: "transparent",
                      color: "var(--app-text-secondary)",
                      border: "1.5px solid rgba(74,62,61,0.3)",
                      boxShadow: "1px 2px 8px rgba(0,0,0,0.06)",
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="var(--app-primary)" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="text-xs">{lang === "zh" ? "拍照 / 相册" : "Camera / Gallery"}</span>
                  </motion.button>
                </div>
              )}

              {/* Retry if invalid */}
              {photoInvalid && (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => { setPhotoInvalid(false); fileInputRef.current?.click(); }}
                  className="w-full text-xs font-semibold py-3 rounded"
                  style={{ border: "1.5px solid rgba(74,62,61,0.25)", color: "var(--app-text-secondary)", background: "rgba(255,255,255,0.6)" }}
                >
                  {t("ingredients.retry")}
                </motion.button>
              )}

              {/* Skip */}
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleMix}
                disabled={isGenerating}
                className="w-full text-xs font-semibold py-3 text-center"
                style={{ color: "var(--app-text-muted)" }}
              >
                {isGenerating ? t("flavor.loading") : t("ingredients.skip")} →
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
