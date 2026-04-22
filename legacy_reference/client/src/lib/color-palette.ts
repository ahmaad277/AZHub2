export const COLOR_PALETTE_IDS = ["azure", "emerald", "violet", "amber", "slate"] as const;

export type ColorPaletteId = (typeof COLOR_PALETTE_IDS)[number];

export const DEFAULT_COLOR_PALETTE: ColorPaletteId = "azure";

const STORAGE_KEY = "colorPalette";

const SET = new Set<string>(COLOR_PALETTE_IDS);

export function normalizeColorPalette(value: string | null | undefined): ColorPaletteId {
  if (value && SET.has(value)) {
    return value as ColorPaletteId;
  }
  return DEFAULT_COLOR_PALETTE;
}

export function loadStoredColorPalette(): ColorPaletteId {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalizeColorPalette(raw);
  } catch {
    return DEFAULT_COLOR_PALETTE;
  }
}

export function persistColorPalette(palette: ColorPaletteId): void {
  try {
    localStorage.setItem(STORAGE_KEY, palette);
  } catch {
    // Ignore storage failures (privacy mode, etc.)
  }
}

export function applyColorPaletteToDocument(palette: ColorPaletteId): void {
  const root = document.documentElement;
  root.setAttribute("data-color-palette", palette);
}

export function applyStoredOrDefaultColorPalette(): void {
  applyColorPaletteToDocument(loadStoredColorPalette());
}
