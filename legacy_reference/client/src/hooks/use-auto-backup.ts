import { useEffect, useRef } from "react";

type BackupSettings = {
  enabled: boolean;
  frequencyHours: number;
  maxBackups: number;
  autoCleanup: boolean;
  lastBackup?: string;
};

export function useAutoBackup() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastBackupRef = useRef<string | null>(null);

  useEffect(() => {
    const checkAndPerformBackup = async () => {
      try {
        // Load settings from localStorage
        const savedSettings = localStorage.getItem("backupSettings");
        if (!savedSettings) return;

        const settings: BackupSettings = JSON.parse(savedSettings);
        if (!settings.enabled) return;

        // Check if it's time to backup
        const now = new Date();
        const lastBackup = settings.lastBackup ? new Date(settings.lastBackup) : null;
        const intervalMs = settings.frequencyHours * 60 * 60 * 1000;

        if (!lastBackup || (now.getTime() - lastBackup.getTime()) >= intervalMs) {
          // Prevent duplicate backups
          if (lastBackupRef.current === settings.lastBackup) return;
          lastBackupRef.current = settings.lastBackup || "";

          // Perform backup
          const response = await fetch("/api/export-data");
          if (!response.ok) {
            throw new Error("Failed to export data");
          }

          const data = await response.json();

          // Create automatic backup filename
          const timestamp = now.toISOString().slice(0, 16).replace("T", "-").replace(":", "");
          const filename = `auto-backup-${timestamp}.json`;

          // Save to localStorage for persistence (in production, this would be sent to cloud storage)
          const backupData = {
            filename,
            timestamp: now.toISOString(),
            data: JSON.stringify(data),
          };

          // Store in localStorage (limited space, so we keep only recent backups)
          const existingBackups = JSON.parse(localStorage.getItem("autoBackups") || "[]");
          existingBackups.push(backupData);

          // Keep only the most recent backups
          const maxBackups = settings.maxBackups || 7;
          if (existingBackups.length > maxBackups) {
            existingBackups.splice(0, existingBackups.length - maxBackups);
          }

          localStorage.setItem("autoBackups", JSON.stringify(existingBackups));

          // Update last backup time
          const updatedSettings = {
            ...settings,
            lastBackup: now.toISOString(),
          };
          localStorage.setItem("backupSettings", JSON.stringify(updatedSettings));

          console.log(`Auto-backup created: ${filename}`);
        }
      } catch (error) {
        console.error("Auto-backup failed:", error);
      }
    };

    // Set up interval to check every hour
    intervalRef.current = setInterval(checkAndPerformBackup, 60 * 60 * 1000); // Check every hour

    // Initial check
    checkAndPerformBackup();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return null;
}