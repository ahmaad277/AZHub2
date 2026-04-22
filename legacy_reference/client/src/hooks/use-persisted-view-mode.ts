import { useState, useEffect } from "react";

export type ViewMode = "ultra-compact" | "compact" | "expanded";

const STORAGE_KEY = "investment-view-mode";
const DEFAULT_MODE: ViewMode = "ultra-compact"; // Default to ultra-compact for density

/**
 * Hook to manage view mode with localStorage persistence (SSR-safe)
 * 
 * @param storageKey - Optional custom localStorage key (default: "investment-view-mode")
 * @param defaultMode - Optional default mode (default: "ultra-compact")
 * @returns [viewMode, setViewMode, cycleMode]
 */
export function usePersistedViewMode(
  storageKey: string = STORAGE_KEY,
  defaultMode: ViewMode = DEFAULT_MODE
): [ViewMode, (mode: ViewMode) => void, () => void] {
  const [viewMode, setViewModeState] = useState<ViewMode>(defaultMode);

  // Hydrate from localStorage after mount (client-side only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(storageKey);
      if (stored === "ultra-compact" || stored === "compact" || stored === "expanded") {
        setViewModeState(stored);
      }
    }
  }, [storageKey]);

  // Setter function that updates both state and localStorage
  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, mode);
    }
  };

  // Cycle through modes: ultra-compact → compact → expanded → ultra-compact
  const cycleMode = () => {
    setViewModeState(current => {
      const next = current === "ultra-compact" ? "compact"
                 : current === "compact" ? "expanded"
                 : "ultra-compact";
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, next);
      }
      return next;
    });
  };

  return [viewMode, setViewMode, cycleMode];
}
