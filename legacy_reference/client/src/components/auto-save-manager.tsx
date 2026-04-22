import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/language-provider";
import { Clock, Save, Trash2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

type AutoSaveSettings = {
  enabled: boolean;
  intervalHours: number;
  maxCheckpoints: number;
  cleanupEnabled: boolean;
  lastAutoSave?: string;
};

export function AutoSaveManager() {
  const { t } = useLanguage();
  const { toast } = useToast();

  const [settings, setSettings] = useState<AutoSaveSettings>({
    enabled: false,
    intervalHours: 24,
    maxCheckpoints: 10,
    cleanupEnabled: true,
  });

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("autoSaveSettings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
      } catch (error) {
        console.error("Failed to parse auto-save settings:", error);
      }
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = (newSettings: AutoSaveSettings) => {
    setSettings(newSettings);
    localStorage.setItem("autoSaveSettings", JSON.stringify(newSettings));
  };

  // Auto-save mutation
  const autoSaveMutation = useMutation({
    mutationFn: async () => {
      const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ");
      const name = `Auto-save ${timestamp}`;
      return await apiRequest("POST", "/api/snapshots", { name });
    },
    onSuccess: () => {
      const newSettings = {
        ...settings,
        lastAutoSave: new Date().toISOString(),
      };
      saveSettings(newSettings);
      queryClient.invalidateQueries({ queryKey: ["/api/snapshots"] });
      toast({
        title: t("checkpoints.autoSaveSuccess"),
        description: t("checkpoints.savedDesc"),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("checkpoints.autoSaveError"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cleanup old checkpoints
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/snapshots/cleanup", {
        maxCheckpoints: settings.maxCheckpoints,
      });
      return response.json() as Promise<{ deletedCount?: number }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/snapshots"] });
      toast({
        title: t("checkpoints.autoSaveCleanup"),
        description: `تم حذف ${data.deletedCount || 0} نقاط تفتيش قديمة`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("dialog.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Manual auto-save
  const handleManualAutoSave = () => {
    autoSaveMutation.mutate();
  };

  // Manual cleanup
  const handleManualCleanup = () => {
    cleanupMutation.mutate();
  };

  // Toggle auto-save
  const handleToggleAutoSave = (enabled: boolean) => {
    const newSettings = { ...settings, enabled };
    saveSettings(newSettings);

    if (enabled) {
      toast({
        title: t("checkpoints.autoSave"),
        description: "تم تفعيل الحفظ التلقائي",
      });
    } else {
      toast({
        title: t("checkpoints.autoSave"),
        description: "تم إلغاء تفعيل الحفظ التلقائي",
      });
    }
  };

  // Update interval
  const handleIntervalChange = (intervalHours: number) => {
    const newSettings = { ...settings, intervalHours };
    saveSettings(newSettings);
  };

  // Update max checkpoints
  const handleMaxCheckpointsChange = (maxCheckpoints: number) => {
    const newSettings = { ...settings, maxCheckpoints };
    saveSettings(newSettings);
  };

  // Toggle cleanup
  const handleToggleCleanup = (cleanupEnabled: boolean) => {
    const newSettings = { ...settings, cleanupEnabled };
    saveSettings(newSettings);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {t("checkpoints.autoSave")}
        </CardTitle>
        <CardDescription>
          {t("checkpoints.autoSaveEnabled")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Auto-save */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("checkpoints.autoSaveEnabled")}</Label>
            <p className="text-sm text-muted-foreground">
              إنشاء نقاط تفتيش تلقائياً حسب الجدولة
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={handleToggleAutoSave}
          />
        </div>

        {/* Auto-save Interval */}
        <div className="space-y-2">
          <Label>{t("checkpoints.autoSaveInterval")}</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="1"
              max="168"
              value={settings.intervalHours}
              onChange={(e) => handleIntervalChange(parseInt(e.target.value) || 24)}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">
              {t("checkpoints.autoSaveIntervalHours")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            الحد الأدنى: 1 ساعة، الحد الأقصى: 7 أيام (168 ساعة)
          </p>
        </div>

        {/* Max Checkpoints */}
        <div className="space-y-2">
          <Label>{t("checkpoints.autoSaveMaxCheckpoints")}</Label>
          <Input
            type="number"
            min="1"
            max="100"
            value={settings.maxCheckpoints}
            onChange={(e) => handleMaxCheckpointsChange(parseInt(e.target.value) || 10)}
            className="w-20"
          />
          <p className="text-xs text-muted-foreground">
            عند الوصول لهذا العدد، سيتم حذف أقدم النقاط تلقائياً
          </p>
        </div>

        {/* Auto-cleanup */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t("checkpoints.autoSaveCleanup")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("checkpoints.autoSaveCleanupEnabled")}
            </p>
          </div>
          <Switch
            checked={settings.cleanupEnabled}
            onCheckedChange={handleToggleCleanup}
          />
        </div>

        {/* Last Auto-save */}
        <div className="space-y-2">
          <Label>{t("checkpoints.autoSaveLastSaved")}</Label>
          <p className="text-sm text-muted-foreground">
            {settings.lastAutoSave
              ? format(new Date(settings.lastAutoSave), "PPP p", { locale: undefined })
              : t("checkpoints.autoSaveNever")
            }
          </p>
        </div>

        {/* Manual Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            onClick={handleManualAutoSave}
            disabled={autoSaveMutation.isPending}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {autoSaveMutation.isPending
              ? t("checkpoints.autoSaveInProgress")
              : "إنشاء حفظ تلقائي الآن"
            }
          </Button>
          <Button
            variant="outline"
            onClick={handleManualCleanup}
            disabled={cleanupMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            تنظيف الآن
          </Button>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              تنبيه مهم
            </p>
            <p className="text-amber-700 dark:text-amber-300 mt-1">
              الحفظ التلقائي يستهلك مساحة تخزين. تأكد من مراقبة عدد النقاط المحفوظة.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}