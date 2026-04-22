import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDataEntry } from "@/lib/data-entry-context";
import { useTheme } from "@/lib/theme-provider";
import type { UserSettings } from "@shared/schema";
import {
  applyColorPaletteToDocument,
  loadStoredColorPalette,
  normalizeColorPalette,
  persistColorPalette,
} from "@/lib/color-palette";

function isLightDark(value: string | null | undefined): value is "light" | "dark" {
  return value === "light" || value === "dark";
}

/**
 * Applies accent palette from localStorage immediately, then syncs theme + color palette from GET /api/settings when available.
 */
export function SettingsAppearanceSync() {
  const { isDataEntryMode, isInitializing } = useDataEntry();
  const { setTheme } = useTheme();

  useEffect(() => {
    applyColorPaletteToDocument(loadStoredColorPalette());
  }, []);

  const { data } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
    enabled: !isInitializing && !isDataEntryMode,
  });

  useEffect(() => {
    const t = data?.theme;
    if (!isLightDark(t)) return;
    setTheme(t);
  }, [data?.theme, setTheme]);

  useEffect(() => {
    if (!data?.colorPalette) return;
    const palette = normalizeColorPalette(data.colorPalette);
    applyColorPaletteToDocument(palette);
    persistColorPalette(palette);
  }, [data?.colorPalette]);

  return null;
}
