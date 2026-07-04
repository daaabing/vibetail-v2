"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Lang = "zh" | "en";

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextType>({
  lang: "en",
  setLang: () => {},
  t: (k) => k,
});

export const translations: Record<Lang, Record<string, string>> = {
  zh: {
    // Landing
    "landing.tagline": "人不一定清醒，酒一定要对味",
    "landing.subtitle": "把此刻心情，调成难忘体验",
    "landing.cta.mix": "测一下我的 Vibe",
    "landing.cta.bar": "查看 Vibe Bar",
    "lang.toggle": "EN",
    // Nav
    "nav.vibeCheck": "Vibe Check",
    "nav.vibeBar": "Vibe Bar",
    // Step 3 — Ingredients photo
    "ingredients.title": "你冰箱里有什么？",
    "ingredients.subtitle": "上传食材照片，我们只用你有的东西来调酒。或者跳过这步。",
    "ingredients.upload": "上传照片",
    "ingredients.skip": "跳过这步",
    "ingredients.analyzing": "正在识别食材…",
    "ingredients.detected": "识别到的食材",
    "ingredients.detected.continue": "就用这些来调酒",
    "ingredients.retry": "重新上传",
    "ingredients.invalid": "这张照片里没找到可以调酒的食材 🍸 请上传包含饮品材料的照片，比如酒、果汁、苏打水、咖啡、茶、牛奶或水。",
    "ingredients.step": "第 03 步 / 共 03 步",
    // Mood Input
    "mood.title": "你现在是什么状态？",
    "mood.subtitle": "选一个或者自己写。",
    "mood.chips.label": "快速选 Vibe",
    "mood.divider": "或者自己写",
    "mood.surprise": "随机一个",
    "mood.next": "下一步 — 选口味",
    "mood.exit": "退出",
    "mood.back": "返回",
    "mood.step1": "第 01 步 / 共 02 步",
    "mood.step2": "第 02 步 / 共 02 步",
    // Flavor
    "flavor.title": "你希望它喝起来是什么感觉？",
    "flavor.subtitle": "可以跳过，我们帮你选。",
    "flavor.chips.label": "口味偏好（可选）",
    "flavor.custom.label": "有参考的酒或口味？（可选）",
    "flavor.run": "开始调酒",
    "flavor.loading": "正在读取你的 Vibe...",
    // Result
    "result.home": "首页",
    "result.checked": "VIBE 已解析 ✓",
    "result.distilling": "正在调制心情中…",
    "result.tap": "点击翻面",
    "result.tap.menu": "点击查看推荐酒单",
    "result.original": "原始 Vibe",
    "result.tasting": "品鉴笔记",
    "result.ingredients": "配方成分",
    "result.ingredients.ref": "仅供参考",
    "result.ingredients.bar": "最终解释权与执行权归酒吧所有",
    "result.howToMake": "调制方法",
    "result.diagnosis": "Vibe 诊断",

    "result.save": "保存卡片",
    "result.saving": "保存中…",
    "result.share": "分享",
    "result.print": "打印",
    "result.copied": "链接已复制 ✓",
    "result.another": "再测一次",
    // Gallery
    "gallery.home": "首页",
    "gallery.title": "Vibe Bar",
    "gallery.addVibe": "+ Vibe",
    "gallery.empty": "还没有任何 Vibe，去混第一杯吧。",
    "gallery.emptyBtn": "测一下我的 Vibe",
    "gallery.prev": "← 上一页",
    "gallery.next": "下一页 →",
    "gallery.ago": "前",
  },
  en: {
    // Landing
    "landing.tagline": "Every mood deserves the perfect pour.",
    "landing.subtitle": "Turn your current vibe into a cocktail.",
    "landing.cta.mix": "Check My Vibe",
    "landing.cta.bar": "View the Vibe Bar",
    "lang.toggle": "中",
    // Nav
    "nav.vibeCheck": "Vibe Check",
    "nav.vibeBar": "Vibe Bar",
    // Step 3 — Ingredients photo
    "ingredients.title": "What's in your fridge?",
    "ingredients.subtitle": "Upload your ingredients, and we'll mix something using only what you have. Or skip this step.",
    "ingredients.upload": "Upload Photo",
    "ingredients.skip": "Skip",
    "ingredients.analyzing": "Analyzing ingredients…",
    "ingredients.detected": "Detected ingredients",
    "ingredients.detected.continue": "Mix with these ingredients",
    "ingredients.retry": "Try another photo",
    "ingredients.invalid": "We couldn't mix a drink from this photo yet 🍸 Please upload a photo with at least one drinkable liquid, like alcohol, juice, soda, coffee, tea, milk, sparkling water, or water.",
    "ingredients.step": "STEP 03 / 03",
    // Mood Input
    "mood.title": "What's your current vibe?",
    "mood.subtitle": "Pick one or type your own.",
    "mood.chips.label": "Quick vibes",
    "mood.divider": "OR TYPE YOUR OWN",
    "mood.surprise": "SURPRISE ME",
    "mood.next": "Next — Choose Flavor",
    "mood.exit": "EXIT LAB",
    "mood.back": "BACK",
    "mood.step1": "STEP 01 / 02",
    "mood.step2": "STEP 02 / 02",
    // Flavor
    "flavor.title": "What should it taste like?",
    "flavor.subtitle": "Optional — skip and we'll choose for you.",
    "flavor.chips.label": "Flavor modifiers (optional)",
    "flavor.custom.label": "Any flavor reference? (optional)",
    "flavor.run": "Run the Vibe Check",
    "flavor.loading": "Reading your vibe...",
    // Result
    "result.home": "HOME",
    "result.checked": "VIBE CHECKED ✓",
    "result.distilling": "CRAFTING THE MOOD…",
    "result.tap": "TAP TO FLIP",
    "result.original": "ORIGINAL VIBE",
    "result.tasting": "TASTING NOTES",
    "result.ingredients": "INGREDIENTS",
    "result.ingredients.ref": "for reference",
    "result.ingredients.bar": "Final interpretation & execution reserved by the bar",
    "result.howToMake": "HOW TO MAKE",
    "result.diagnosis": "VIBE DIAGNOSIS",
    "result.save": "Save Card",
    "result.saving": "Saving…",
    "result.share": "Share",
    "result.print": "Print",
    "result.copied": "Link Copied ✓",
    "result.another": "Check Another Vibe",
    // Gallery
    "gallery.home": "HOME",
    "gallery.title": "Vibe Bar",
    "gallery.addVibe": "+ VIBE",
    "gallery.empty": "No vibes yet. Go mix the first one.",
    "gallery.emptyBtn": "Check My Vibe",
    "gallery.prev": "← Prev",
    "gallery.next": "Next →",
    "gallery.ago": "ago",
  },
};

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("vibetail-lang") as Lang | null;
    if (saved === "en" || saved === "zh") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("vibetail-lang", l);
  };

  const t = (key: string) =>
    translations[lang][key] ?? translations["en"][key] ?? key;

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
