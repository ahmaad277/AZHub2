import { useEffect, useRef } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

type AutoSaveSettings = {
  enabled: boolean;
  intervalHours: number;
  maxCheckpoints: number;
  cleanupEnabled: boolean;
  lastAutoSave?: string;
};

export function useAutoSave() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveRef = useRef<string | null>(null);

  useEffect(() => {
    const checkAndPerformAutoSave = async () => {
      try {
        // Load settings from localStorage
        const savedSettings = localStorage.getItem("autoSaveSettings");
        if (!savedSettings) return;

        const settings: AutoSaveSettings = JSON.parse(savedSettings);
        if (!settings.enabled) return;

        // Check if it's time to auto-save
        const now = new Date();
        const lastSave = settings.lastAutoSave ? new Date(settings.lastAutoSave) : null;
        const intervalMs = settings.intervalHours * 60 * 60 * 1000;

        if (!lastSave || (now.getTime() - lastSave.getTime()) >= intervalMs) {
          // Prevent duplicate saves
          if (lastSaveRef.current === settings.lastAutoSave) return;
          lastSaveRef.current = settings.lastAutoSave || "";

          // Perform auto-save
          const timestamp = now.toISOString().slice(0, 16).replace("T", " ");
          const name = `Auto-save ${timestamp}`;

          await apiRequest("POST", "/api/snapshots", { name });

          // Update last save time
          const updatedSettings = {
            ...settings,
            lastAutoSave: now.toISOString(),
          };
          localStorage.setItem("autoSaveSettings", JSON.stringify(updatedSettings));

          // Perform cleanup if enabled
          if (settings.cleanupEnabled) {
            try {
              await apiRequest("POST", "/api/snapshots/cleanup", {
                maxCheckpoints: settings.maxCheckpoints,
              });
            } catch (cleanupError) {
              console.warn("Auto-cleanup failed:", cleanupError);
            }
          }

          // Invalidate queries to refresh UI
          queryClient.invalidateQueries({ queryKey: ["/api/snapshots"] });

          console.log(`Auto-saved checkpoint: ${name}`);
        }
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    };

    // Set up interval to check every 5 minutes
    intervalRef.current = setInterval(checkAndPerformAutoSave, 5 * 60 * 1000);

    // Initial check
    checkAndPerformAutoSave();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return null;
}