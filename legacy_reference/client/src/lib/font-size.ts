export type AppFontSize = "small" | "medium" | "large";

export const APP_FONT_SIZE_STORAGE_KEY = "azfinance-font-size";

const FONT_SIZE_IN_PX: Record<AppFontSize, number> = {
  small: 15,
  medium: 17,
  large: 19,
};

export function normalizeFontSize(value: string | null | undefined): AppFontSize {
  if (value === "small" || value === "medium" || value === "large") {
    return value;
  }
  return "medium";
}

export function applyAppFontSize(size: string | null | undefined): AppFontSize {
  const normalized = normalizeFontSize(size);
  const html = document.documentElement;
  html.dataset.fontSize = normalized;
  html.style.fontSize = `${FONT_SIZE_IN_PX[normalized]}px`;
  return normalized;
}

export function loadStoredFontSize(): AppFontSize {
  if (typeof window === "undefined") return "medium";
  const stored = window.localStorage.getItem(APP_FONT_SIZE_STORAGE_KEY);
  return normalizeFontSize(stored);
}

export function persistFontSize(size: string | null | undefined): AppFontSize {
  const normalized = normalizeFontSize(size);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(APP_FONT_SIZE_STORAGE_KEY, normalized);
  }
  return normalized;
}
