import { createContext, useContext } from "react";

export type Lang = "en" | "zh";

export const LangContext = createContext<Lang>("en");

export function useLang(): { lang: Lang; t: (en: string, zh: string) => string } {
  const lang = useContext(LangContext);
  return { lang, t: (en, zh) => (lang === "zh" ? zh : en) };
}
