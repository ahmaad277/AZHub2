import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-provider";
import { CloudUpload, Download, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

type BackupSettings = {
  enabled: boolean;
  frequencyHours: number;
  maxBackups: number;
  lastBackup?: string;
  autoCleanup: boolean;
};

export function BackupManager() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [settings, setSettings] = useState<BackupSettings>({
    enabled: false,
    frequencyHours: 24,
    maxBackups: 7,
    autoCleanup: true,
  });

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("backupSettings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
      } catch (error) {
        console.error("Failed to parse backup settings:", error);
      }
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = (newSettings: BackupSettings) => {
    setSettings(newSettings);
    localStorage.setItem("backupSettings", JSON.stringify(newSettings));
  };

  // Manual backup mutation
  const backupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/export-data", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to export data");
      }

      const data = await response.json();

      // Create download
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return data;
    },
    onSuccess: () => {
      const newSettings = {
        ...settings,
        lastBackup: new Date().toISOString(),
      };
      saveSettings(newSettings);

      toast({
        title: "Backup Created",
        description: "Portfolio data has been exported successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Backup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle manual backup
  const handleManualBackup = () => {
    backupMutation.mutate();
  };

  // Toggle auto backup
  const handleToggleAutoBackup = (enabled: boolean) => {
    const newSettings = { ...settings, enabled };
    saveSettings(newSettings);

    if (enabled) {
      toast({
        title: "Auto Backup Enabled",
        description: "Automatic backups will be created according to schedule",
      });
    } else {
      toast({
        title: "Auto Backup Disabled",
        description: "Automatic backup creation has been stopped",
      });
    }
  };

  // Update frequency
  const handleFrequencyChange = (frequencyHours: number) => {
    const newSettings = { ...settings, frequencyHours };
    saveSettings(newSettings);
  };

  // Update max backups
  const handleMaxBackupsChange = (maxBackups: number) => {
    const newSettings = { ...settings, maxBackups };
    saveSettings(newSettings);
  };

  // Toggle auto cleanup
  const handleToggleCleanup = (autoCleanup: boolean) => {
    const newSettings = { ...settings, autoCleanup };
    saveSettings(newSettings);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudUpload className="h-5 w-5" />
          Data Backup Manager
        </CardTitle>
        <CardDescription>
          Create and manage automatic backups of your portfolio data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Auto Backup */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Enable Automatic Backups</Label>
            <p className="text-sm text-muted-foreground">
              Automatically create backups of your portfolio data
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={handleToggleAutoBackup}
          />
        </div>

        {/* Backup Frequency */}
        <div className="space-y-2">
          <Label>Backup Frequency</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              max="168"
              value={settings.frequencyHours}
              onChange={(e) => handleFrequencyChange(parseInt(e.target.value) || 24)}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">hours</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Minimum: 1 hour, Maximum: 7 days (168 hours)
          </p>
        </div>

        {/* Max Backups */}
        <div className="space-y-2">
          <Label>Maximum Backup Files</Label>
          <Input
            type="number"
            min="1"
            max="50"
            value={settings.maxBackups}
            onChange={(e) => handleMaxBackupsChange(parseInt(e.target.value) || 7)}
            className="w-20"
          />
          <p className="text-xs text-muted-foreground">
            Older backups will be automatically deleted when limit is reached
          </p>
        </div>

        {/* Auto-cleanup */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Auto-cleanup Old Backups</Label>
            <p className="text-sm text-muted-foreground">
              Automatically delete old backup files when limit is reached
            </p>
          </div>
          <Switch
            checked={settings.autoCleanup}
            onCheckedChange={handleToggleCleanup}
          />
        </div>

        {/* Last Backup */}
        <div className="space-y-2">
          <Label>Last Backup</Label>
          <p className="text-sm text-muted-foreground">
            {settings.lastBackup
              ? format(new Date(settings.lastBackup), "PPP p", { locale: undefined })
              : "Never"
            }
          </p>
        </div>

        {/* Manual Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={handleManualBackup}
            disabled={backupMutation.isPending}
            className="flex-1"
          >
            <Download className="h-4 w-4 mr-2" />
            {backupMutation.isPending ? "Creating Backup..." : "Create Backup Now"}
          </Button>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-blue-800 dark:text-blue-200">
              Backup Security
            </p>
            <p className="text-blue-700 dark:text-blue-300 mt-1">
              Backup files contain all your portfolio data. Store them securely and never share them publicly.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}