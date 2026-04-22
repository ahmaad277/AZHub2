export type UiLanguage = "en" | "ar";

export function getLanguageAttributes(language: UiLanguage): { lang: string; dir: "ltr" | "rtl" } {
  return { lang: language, dir: language === "ar" ? "rtl" : "ltr" };
}

/** Keeps `lang` / `dir` / `localStorage.language` aligned with the UI language. */
export function syncDocumentLanguage(language: UiLanguage): void {
  if (typeof document === "undefined") return;
  const { lang, dir } = getLanguageAttributes(language);
  const root = document.documentElement;
  root.setAttribute("lang", lang);
  root.setAttribute("dir", dir);
  try {
    localStorage.setItem("language", language);
  } catch {
    // Storage may be unavailable in private mode or hardened environments.
  }
}
