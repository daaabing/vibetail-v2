/** English-only. Kept as a type so ported components read the same. */
export type Lang = "en";
export function useLang() {
  return { lang: "en" as Lang, t: (k: string) => k };
}
