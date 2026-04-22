import { lazy, Suspense, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Settings2, Plus, Palette, Globe, TrendingUp, Shield, Fingerprint, Edit, Trash2, Bell, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { useLanguage } from "@/lib/language-provider";
import { useTheme } from "@/lib/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { UserSettings, Platform } from "@shared/schema";
import { checkBiometricSupport, registerBiometric } from "@/lib/biometric-auth";
import {
  applyAppFontSize,
  loadStoredFontSize,
  normalizeFontSize,
  persistFontSize,
} from "@/lib/font-size";
import { CheckpointsManager } from "@/components/checkpoints-manager";
import {
  getStoredShareBaseUrl,
  isValidShareBaseUrl,
  normalizeShareBaseUrlInput,
  setStoredShareBaseUrl,
} from "@/lib/share-link";
import { PageErrorState, PageLoadingState } from "@/components/ui/view-states";
import {
  COLOR_PALETTE_IDS,
  DEFAULT_COLOR_PALETTE,
  applyColorPaletteToDocument,
  normalizeColorPalette,
  persistColorPalette,
} from "@/lib/color-palette";

const ResetPortfolioDialog = lazy(() =>
  import("@/components/reset-portfolio-dialog").then((module) => ({
    default: module.ResetPortfolioDialog,
  })),
);
const AutoSaveManager = lazy(() =>
  import("@/components/auto-save-manager").then((module) => ({
    default: module.AutoSaveManager,
  })),
);
const SystemHealthMonitor = lazy(() =>
  import("@/components/system-health-monitor").then((module) => ({
    default: module.SystemHealthMonitor,
  })),
);
const AutoBackupViewer = lazy(() =>
  import("@/components/auto-backup-viewer").then((module) => ({
    default: module.AutoBackupViewer,
  })),
);
const BackupCleanup = lazy(() =>
  import("@/components/backup-cleanup").then((module) => ({
    default: module.BackupCleanup,
  })),
);
const SystemStats = lazy(() =>
  import("@/components/system-stats").then((module) => ({
    default: module.SystemStats,
  })),
);
const BackupManager = lazy(() =>
  import("@/components/backup-manager").then((module) => ({
    default: module.BackupManager,
  })),
);

export default function Settings() {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [newPlatformName, setNewPlatformName] = useState("");
  const [newPlatformType, setNewPlatformType] = useState<string>("sukuk");
  const [newPlatformFeePercentage, setNewPlatformFeePercentage] = useState("0");
  const [newPlatformDeductFees, setNewPlatformDeductFees] = useState(true);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [isRegisteringBiometric, setIsRegisteringBiometric] = useState(false);
  const [platformToDelete, setPlatformToDelete] = useState<Platform | null>(null);
  const [platformToEdit, setPlatformToEdit] = useState<Platform | null>(null);
  const [editPlatformName, setEditPlatformName] = useState("");
  const [editPlatformFeePercentage, setEditPlatformFeePercentage] = useState("0");
  const [editPlatformDeductFees, setEditPlatformDeductFees] = useState(true);
  const [showResetDialog, setShowResetDialog] = useState(false);

  // Local settings state for Save/Cancel/Reset functionality
  const [localSettings, setLocalSettings] = useState<Partial<UserSettings>>({});
  const [localTheme, setLocalTheme] = useState<string>("dark");
  const [localLanguage, setLocalLanguage] = useState<string>("en");
  const [shareBaseUrlInput, setShareBaseUrlInput] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);
  const shareBaseUrlInvalid = !isValidShareBaseUrl(shareBaseUrlInput);

  const {
    data: settings,
    isLoading: settingsLoading,
    error: settingsError,
    refetch: refetchSettings,
  } = useQuery<UserSettings>({
    queryKey: ["/api/settings"],
  });

  const {
    data: platforms,
    isLoading: platformsLoading,
    error: platformsError,
    refetch: refetchPlatforms,
  } = useQuery<Platform[]>({
    queryKey: ["/api/platforms"],
  });

  // Initialize local settings from server settings
  useEffect(() => {
    if (settings) {
      setLocalSettings({
        fontSize: settings.fontSize,
        viewMode: settings.viewMode,
        theme: settings.theme,
        colorPalette: normalizeColorPalette(settings.colorPalette),
        language: settings.language,
        targetCapital2040: settings.targetCapital2040,
        autoReinvest: settings.autoReinvest,
        alertsEnabled: settings.alertsEnabled,
        alertDaysBefore: settings.alertDaysBefore,
        latePaymentAlertsEnabled: settings.latePaymentAlertsEnabled,
        securityEnabled: settings.securityEnabled,
      });
      setLocalTheme(settings.theme || "dark");
      setLocalLanguage(settings.language || "en");
      setHasChanges(false);
    }
  }, [settings]);

  // Sync localTheme with global theme context
  useEffect(() => {
    setLocalTheme(theme);
    // Also update localSettings.theme to ensure Save persists the correct value
    setLocalSettings(prev => ({ ...prev, theme }));
  }, [theme]);

  // Sync localLanguage with global language context
  useEffect(() => {
    setLocalLanguage(language);
    // Also update localSettings.language to ensure Save persists the correct value
    setLocalSettings(prev => ({ ...prev, language }));
  }, [language]);

  // Apply fontSize from local settings
  useEffect(() => {
    const fallback = loadStoredFontSize();
    applyAppFontSize(localSettings.fontSize || fallback);
  }, [localSettings.fontSize]);

  // Check biometric support on load
  useEffect(() => {
    async function check() {
      const support = await checkBiometricSupport();
      setBiometricAvailable(support.platformAuthenticator);
    }
    check();
  }, []);

  useEffect(() => {
    setShareBaseUrlInput(getStoredShareBaseUrl());
  }, []);

  // Populate edit platform fields when dialog opens
  useEffect(() => {
    if (platformToEdit) {
      setEditPlatformName(platformToEdit.name);
      setEditPlatformFeePercentage(platformToEdit.feePercentage || "0");
      setEditPlatformDeductFees(platformToEdit.deductFees === 1);
    } else {
      setEditPlatformName("");
      setEditPlatformFeePercentage("0");
      setEditPlatformDeductFees(true);
    }
  }, [platformToEdit]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<UserSettings>) => {
      return apiRequest("PUT", "/api/settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: t("settings.saved"),
        description: t("settings.savedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("dialog.error"),
        description: t("settings.saveError"),
        variant: "destructive",
      });
    },
  });

  const addPlatformMutation = useMutation({
    mutationFn: async (data: { name: string; type: string; feePercentage: number; deductFees: number }) => {
      return apiRequest("POST", "/api/platforms", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });
      setNewPlatformName("");
      setNewPlatformFeePercentage("0");
      setNewPlatformDeductFees(true);
      toast({
        title: t("settings.platformAdded"),
        description: t("settings.platformAddedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("dialog.error"),
        description: t("settings.platformAddError"),
        variant: "destructive",
      });
    },
  });

  const updatePlatformMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; feePercentage?: number; deductFees?: number }) => {
      return apiRequest("PUT", `/api/platforms/${data.id}`, { 
        name: data.name,
        feePercentage: data.feePercentage,
        deductFees: data.deductFees
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      setPlatformToEdit(null);
      setEditPlatformName("");
      setEditPlatformFeePercentage("0");
      setEditPlatformDeductFees(true);
      toast({
        title: t("settings.platformUpdated"),
        description: t("settings.platformUpdatedDesc"),
      });
    },
    onError: () => {
      toast({
        title: t("dialog.error"),
        description: t("settings.platformUpdateError"),
        variant: "destructive",
      });
    },
  });

  const deletePlatformMutation = useMutation({
    mutationFn: async (platformId: string) => {
      return apiRequest("DELETE", `/api/platforms/${platformId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platforms"] });
      queryClient.invalidateQueries({ queryKey: ["/api/investments"] });
      setPlatformToDelete(null);
      toast({
        title: t("settings.platformDeleted"),
        description: t("settings.platformDeletedDesc"),
      });
    },
    onError: (error: any) => {
      setPlatformToDelete(null);
      const errorMessage = error.message || error.error || t("settings.platformDeleteError");
      toast({
        title: t("dialog.error"),
        description: errorMessage.includes("investment") 
          ? t("settings.platformHasInvestments")
          : errorMessage,
        variant: "destructive",
      });
    },
  });

  // Reset Portfolio Mutation - moved to ResetPortfolioDialog component
  // const resetPortfolioMutation = useMutation({
  //   mutationFn: async (confirmation: string) => {
  //     return apiRequest("POST", "/api/portfolio/reset", {
  //       confirm: confirmation
  //     });
  //   },
  // ...
  // });

  const generateAlertsMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/alerts/generate", {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      toast({
        title: t("settings.alertsGenerated"),
        description: `${data.generatedCount} ${t("settings.alertsGeneratedDesc")}`,
      });
    },
    onError: () => {
      toast({
        title: t("dialog.error"),
        description: t("settings.alertsGenerateError"),
        variant: "destructive",
      });
    },
  });

  const handleFontSizeChange = (fontSize: string) => {
    const normalized = normalizeFontSize(fontSize);
    applyAppFontSize(normalized);
    persistFontSize(normalized);
    setLocalSettings(prev => ({ ...prev, fontSize: normalized }));
    setHasChanges(true);
  };

  const handleViewModeChange = (viewMode: string) => {
    setLocalSettings(prev => ({ ...prev, viewMode }));
    setHasChanges(true);
  };

  const handleThemeChange = (newTheme: string) => {
    setLocalTheme(newTheme);
    setTheme(newTheme as "light" | "dark");
    setLocalSettings(prev => ({ ...prev, theme: newTheme }));
    setHasChanges(true);
  };

  const handleColorPaletteChange = (value: string) => {
    const palette = normalizeColorPalette(value);
    applyColorPaletteToDocument(palette);
    persistColorPalette(palette);
    setLocalSettings(prev => ({ ...prev, colorPalette: palette }));
    setHasChanges(true);
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLocalLanguage(newLanguage);
    setLanguage(newLanguage as "en" | "ar");
    setLocalSettings(prev => ({ ...prev, language: newLanguage }));
    setHasChanges(true);
  };

  const handleTargetCapitalChange = (value: string) => {
    setLocalSettings(prev => ({ ...prev, targetCapital2040: value }));
    setHasChanges(true);
  };

  const handleAutoReinvestChange = (checked: boolean) => {
    setLocalSettings(prev => ({ ...prev, autoReinvest: checked ? 1 : 0 }));
    setHasChanges(true);
  };

  const handleAlertsEnabledChange = (checked: boolean) => {
    setLocalSettings(prev => ({ ...prev, alertsEnabled: checked ? 1 : 0 }));
    setHasChanges(true);
  };

  const handleAlertDaysBeforeChange = (value: number) => {
    setLocalSettings(prev => ({ ...prev, alertDaysBefore: value }));
    setHasChanges(true);
  };

  const handleLatePaymentAlertsChange = (checked: boolean) => {
    setLocalSettings(prev => ({ ...prev, latePaymentAlertsEnabled: checked ? 1 : 0 }));
    setHasChanges(true);
  };

  const handleSecurityEnabledChange = (checked: boolean) => {
    setLocalSettings(prev => ({ ...prev, securityEnabled: checked ? 1 : 0 }));
    setHasChanges(true);
  };

  const handleSaveSettings = () => {
    if (shareBaseUrlInvalid) {
      toast({
        title: t("settings.toast.invalidUrlTitle"),
        description: t("settings.toast.invalidUrlDesc"),
        variant: "destructive",
      });
      return;
    }

    const normalizedShareBaseUrl = normalizeShareBaseUrlInput(shareBaseUrlInput);
    setShareBaseUrlInput(normalizedShareBaseUrl);
    setStoredShareBaseUrl(normalizedShareBaseUrl);
    const normalizedFontSize = normalizeFontSize(localSettings.fontSize || loadStoredFontSize());
    const payload = { ...localSettings, fontSize: normalizedFontSize };
    applyAppFontSize(normalizedFontSize);
    persistFontSize(normalizedFontSize);

    updateSettingsMutation.mutate(payload, {
      onSuccess: () => {
        setHasChanges(false);
      },
    });
  };

  const handleCancelChanges = () => {
    if (settings) {
      setLocalSettings({
        fontSize: settings.fontSize,
        viewMode: settings.viewMode,
        theme: settings.theme,
        colorPalette: normalizeColorPalette(settings.colorPalette),
        language: settings.language,
        targetCapital2040: settings.targetCapital2040,
        autoReinvest: settings.autoReinvest,
        alertsEnabled: settings.alertsEnabled,
        alertDaysBefore: settings.alertDaysBefore,
        latePaymentAlertsEnabled: settings.latePaymentAlertsEnabled,
        securityEnabled: settings.securityEnabled,
      });
      setLocalTheme(settings.theme || "dark");
      setLocalLanguage(settings.language || "en");
      const restoredPalette = normalizeColorPalette(settings.colorPalette);
      applyColorPaletteToDocument(restoredPalette);
      persistColorPalette(restoredPalette);
      const normalizedFontSize = normalizeFontSize(settings.fontSize || "medium");
      applyAppFontSize(normalizedFontSize);
      persistFontSize(normalizedFontSize);
      setShareBaseUrlInput(getStoredShareBaseUrl());
      setTheme((settings.theme || "dark") as "light" | "dark");
      setLanguage((settings.language || "en") as "en" | "ar");
      setHasChanges(false);
      toast({
        title: t("settings.toast.cancelledTitle"),
        description: t("settings.toast.cancelledDesc"),
      });
    }
  };

  const handleResetToDefaults = () => {
    const defaults = {
      fontSize: "medium",
      viewMode: "pro",
      theme: "dark",
      colorPalette: DEFAULT_COLOR_PALETTE,
      language: "en",
      targetCapital2040: "1000000",
      autoReinvest: 0,
      alertsEnabled: 1,
      alertDaysBefore: 7,
      latePaymentAlertsEnabled: 1,
      securityEnabled: 0,
    };
    setLocalSettings(defaults);
    applyAppFontSize(defaults.fontSize);
    persistFontSize(defaults.fontSize);
    applyColorPaletteToDocument(DEFAULT_COLOR_PALETTE);
    persistColorPalette(DEFAULT_COLOR_PALETTE);
    setLocalTheme("dark");
    setLocalLanguage("en");
    setTheme("dark");
    setLanguage("en");
    setHasChanges(true);
    toast({
      title: t("settings.toast.resetDefaultsTitle"),
      description: t("settings.toast.resetDefaultsDesc"),
    });
  };

  const handleAddPlatform = () => {
    if (!newPlatformName.trim()) {
      toast({
        title: t("dialog.error"),
        description: t("settings.platformNameRequired"),
        variant: "destructive",
      });
      return;
    }
    addPlatformMutation.mutate({ 
      name: newPlatformName, 
      type: newPlatformType,
      feePercentage: parseFloat(newPlatformFeePercentage) || 0,
      deductFees: newPlatformDeductFees ? 1 : 0
    });
  };

  const handleSetPIN = async () => {
    if (newPin.length < 4) {
      toast({
        variant: "destructive",
        title: t("dialog.error"),
        description: t("settings.pinTooShort"),
      });
      return;
    }

    if (newPin !== confirmPin) {
      toast({
        variant: "destructive",
        title: t("dialog.error"),
        description: t("settings.pinMismatch"),
      });
      return;
    }

    // Send plain PIN to backend - it will be hashed server-side
    updateSettingsMutation.mutate(
      { 
        pinHash: newPin, // Server expects this field and will hash it
        securityEnabled: 1,
      },
      {
        onSuccess: () => {
          setNewPin("");
          setConfirmPin("");
          toast({
            title: t("settings.pinSet"),
            description: t("settings.pinSetDesc"),
          });
        },
      }
    );
  };

  const handleRegisterBiometric = async () => {
    setIsRegisteringBiometric(true);
    try {
      const credentialId = await registerBiometric(settings?.id || "user");
      if (credentialId) {
        updateSettingsMutation.mutate(
          {
            biometricCredentialId: credentialId,
            biometricEnabled: 1,
          },
          {
            onSuccess: () => {
              toast({
                title: t("settings.biometricRegistered"),
                description: t("settings.biometricRegisteredDesc"),
              });
            },
          }
        );
      } else {
        toast({
          variant: "destructive",
          title: t("dialog.error"),
          description: t("settings.biometricRegisterError"),
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("dialog.error"),
        description: t("settings.biometricRegisterError"),
      });
    } finally {
      setIsRegisteringBiometric(false);
    }
  };


  if (settingsLoading || platformsLoading) {
    return (
      <PageLoadingState
        title={t("settings.pageLoadingTitle")}
        description={t("settings.pageLoadingDesc")}
        rows={4}
        data-testid="state-loading-settings"
      />
    );
  }

  const settingsLoadError = settingsError ?? platformsError;
  if (settingsLoadError) {
    return (
      <PageErrorState
        title={t("settings.pageErrorTitle")}
        description={settingsLoadError instanceof Error ? settingsLoadError.message : t("common.unexpectedError")}
        retryLabel={t("common.tryAgain")}
        onRetry={() => {
          void Promise.all([refetchSettings(), refetchPlatforms()]);
        }}
        data-testid="state-error-settings"
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5" data-testid="page-settings">
      <PageHeader title={t("settings.title")} gradient />

      <div className="grid gap-4 sm:gap-5 md:grid-cols-2 items-start auto-rows-max">
        {/* Appearance Settings */}
        <Card className="shadcn-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">{t("settings.appearance")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-0">
            {/* Theme Toggle */}
            <div className="space-y-1.5">
              <Label>{t("settings.theme")}</Label>
              <Select value={localTheme} onValueChange={handleThemeChange}>
                <SelectTrigger data-testid="select-theme">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">{t("settings.light")}</SelectItem>
                  <SelectItem value="dark">{t("settings.dark")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">{t("settings.colorPalette")}</Label>
              <p className="text-xs text-muted-foreground">{t("settings.colorPaletteDesc")}</p>
              <Select
                value={normalizeColorPalette(localSettings.colorPalette)}
                onValueChange={handleColorPaletteChange}
              >
                <SelectTrigger data-testid="select-color-palette">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLOR_PALETTE_IDS.map((id) => (
                    <SelectItem key={id} value={id} data-testid={`select-color-palette-${id}`}>
                      {t(`settings.colorPalette.${id}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Font Size */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t("settings.fontSize")}</Label>
              <Select value={localSettings.fontSize || "medium"} onValueChange={handleFontSizeChange}>
                <SelectTrigger data-testid="select-font-size">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">{t("settings.small")}</SelectItem>
                  <SelectItem value="medium">{t("settings.medium")}</SelectItem>
                  <SelectItem value="large">{t("settings.large")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* View Mode */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t("settings.viewMode")}</Label>
              <Select value={localSettings.viewMode || "pro"} onValueChange={handleViewModeChange}>
                <SelectTrigger data-testid="select-view-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pro">{t("settings.proMode")}</SelectItem>
                  <SelectItem value="lite">{t("settings.liteMode")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Language & Region */}
        <Card className="shadcn-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">{t("settings.languageRegion")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-0">
            {/* Language */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t("settings.language")}</Label>
              <Select value={localLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger data-testid="select-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ar">العربية</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Currency */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t("settings.currency")}</Label>
              <Input
                value={settings?.currency || "SAR"}
                disabled
                data-testid="input-currency"
              />
            </div>
          </CardContent>
        </Card>

        {/* Investment Goals */}
        <Card className="shadcn-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">{t("settings.investmentGoals")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-0">
            {/* Target Capital 2040 */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t("settings.targetCapital2040")}</Label>
              <Input
                type="number"
                step="1000"
                min="0"
                value={localSettings.targetCapital2040 || ""}
                onChange={(e) => handleTargetCapitalChange(e.target.value)}
                placeholder="1000000"
                data-testid="input-target-capital"
              />
            </div>

            {/* Auto Reinvest */}
            <div className="flex items-center justify-between py-1">
              <Label className="text-sm">{t("settings.autoReinvest")}</Label>
              <Switch
                checked={localSettings.autoReinvest === 1}
                onCheckedChange={handleAutoReinvestChange}
                data-testid="switch-auto-reinvest"
              />
            </div>
          </CardContent>
        </Card>

        {/* Alert Settings */}
        <Card className="shadcn-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">{t("settings.alertSettings")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-0">
            {/* Enable Alerts */}
            <div className="flex items-center justify-between py-1">
              <Label className="text-sm">{t("settings.enableAlerts")}</Label>
              <Switch
                checked={localSettings.alertsEnabled === 1}
                onCheckedChange={handleAlertsEnabledChange}
                data-testid="switch-alerts-enabled"
              />
            </div>

            {/* Days Before Alert */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t("settings.alertDaysBefore")}</Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={localSettings.alertDaysBefore || 7}
                onChange={(e) => handleAlertDaysBeforeChange(parseInt(e.target.value) || 7)}
                disabled={localSettings.alertsEnabled === 0}
                data-testid="input-alert-days-before"
              />
            </div>

            {/* Late Payment Alerts */}
            <div className="flex items-center justify-between py-1">
              <Label className="text-sm">{t("settings.latePaymentAlerts")}</Label>
              <Switch
                checked={localSettings.latePaymentAlertsEnabled === 1}
                onCheckedChange={handleLatePaymentAlertsChange}
                disabled={localSettings.alertsEnabled === 0}
                data-testid="switch-late-payment-alerts"
              />
            </div>

            {/* Generate Alerts Button */}
            <Button
              onClick={() => generateAlertsMutation.mutate()}
              disabled={localSettings.alertsEnabled === 0 || generateAlertsMutation.isPending}
              className="w-full"
              data-testid="button-generate-alerts"
            >
              <Bell className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
              {generateAlertsMutation.isPending 
                ? t("settings.generatingAlerts") 
                : t("settings.generateAlerts")}
            </Button>
          </CardContent>
        </Card>

        {/* Platform Management */}
        <Card className="shadcn-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">{t("settings.platforms")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-0">
            {/* Existing Platforms */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t("settings.existingPlatforms")}</Label>
              <div className="space-y-1.5">
                {platforms?.map((platform) => (
                  <div
                    key={platform.id}
                    className="flex items-center justify-between p-2 rounded-md bg-muted/40 border hover-elevate"
                    data-testid={`platform-${platform.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                        {platform.logoUrl ? (
                          <img src={platform.logoUrl} alt={platform.name} className="h-full w-full object-cover rounded-md" />
                        ) : (
                          <span className="text-sm font-bold text-primary">{platform.name[0]}</span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{platform.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{platform.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        data-testid={`button-edit-platform-${platform.id}`}
                        onClick={() => setPlatformToEdit(platform)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        data-testid={`button-delete-platform-${platform.id}`}
                        onClick={() => setPlatformToDelete(platform)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Add New Platform */}
            <div className="space-y-2">
              <Label className="text-sm">{t("settings.addNewPlatform")}</Label>
              <div className="space-y-1.5">
                <Input
                  value={newPlatformName}
                  onChange={(e) => setNewPlatformName(e.target.value)}
                  placeholder={t("settings.platformNamePlaceholder")}
                  data-testid="input-new-platform-name"
                />
                <Select value={newPlatformType} onValueChange={setNewPlatformType}>
                  <SelectTrigger data-testid="select-platform-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sukuk">Sukuk</SelectItem>
                    <SelectItem value="manfaa">Manfa'a</SelectItem>
                    <SelectItem value="lendo">Lendo</SelectItem>
                    <SelectItem value="other">{t("settings.other")}</SelectItem>
                  </SelectContent>
                </Select>
                <div className="space-y-1.5">
                  <Label className="text-sm">
                    {t("settings.feePercentage")}
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={newPlatformFeePercentage}
                    onChange={(e) => setNewPlatformFeePercentage(e.target.value)}
                    placeholder="0"
                    data-testid="input-new-platform-fee"
                  />
                </div>
                <div className="flex items-center justify-between py-1">
                  <Label className="text-sm">
                    {t("settings.deductFeesFromProfit")}
                  </Label>
                  <Switch
                    checked={newPlatformDeductFees}
                    onCheckedChange={setNewPlatformDeductFees}
                    data-testid="switch-new-platform-deduct-fees"
                  />
                </div>
                <Button
                  onClick={handleAddPlatform}
                  disabled={addPlatformMutation.isPending}
                  className="w-full"
                  data-testid="button-add-platform"
                >
                  <Plus className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                  {addPlatformMutation.isPending ? t("dialog.saving") : t("settings.addPlatform")}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security & Privacy */}
        <Card className="md:col-span-2 shadcn-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">{t("settings.security")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-0">
            {/* Enable Security */}
            <div className="flex items-center justify-between py-1">
              <Label className="text-sm">{t("settings.enableSecurity")}</Label>
              <Switch
                checked={localSettings.securityEnabled === 1}
                onCheckedChange={handleSecurityEnabledChange}
                data-testid="switch-security-enabled"
              />
            </div>

            {/* PIN Setup */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t("settings.setupPIN")}</Label>
              <div className="grid md:grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="new-pin" className="text-sm">{t("settings.enterPIN")}</Label>
                  <Input
                    id="new-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    data-testid="input-new-pin"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm-pin" className="text-sm">{t("settings.confirmPIN")}</Label>
                  <Input
                    id="confirm-pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    data-testid="input-confirm-pin"
                  />
                </div>
              </div>
              <Button
                onClick={handleSetPIN}
                disabled={newPin.length < 4 || confirmPin.length < 4 || updateSettingsMutation.isPending}
                data-testid="button-set-pin"
              >
                {updateSettingsMutation.isPending ? t("dialog.saving") : t("settings.setPIN")}
              </Button>
              {settings?.securityEnabled === 1 && (
                <p className="text-sm text-muted-foreground">
                  ✓ PIN configured
                </p>
              )}
            </div>

            {/* Biometric Authentication */}
            <div className="space-y-1.5">
              <Label className="text-sm">{t("settings.biometric")}</Label>
              
              {!biometricAvailable ? (
                <p className="text-sm text-muted-foreground">{t("settings.biometricNotSupported")}</p>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">{t("settings.enableBiometric")}</Label>
                    <Switch
                      checked={settings?.biometricEnabled === 1}
                      onCheckedChange={(checked) => 
                        updateSettingsMutation.mutate({ biometricEnabled: checked ? 1 : 0 })
                      }
                      disabled={settings?.biometricEnabled !== 1}
                      data-testid="switch-biometric-enabled"
                    />
                  </div>
                  
                  {settings?.securityEnabled === 1 && !settings?.biometricEnabled && (
                    <Button
                      onClick={handleRegisterBiometric}
                      disabled={isRegisteringBiometric}
                      variant="outline"
                      data-testid="button-register-biometric"
                    >
                      <Fingerprint className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                      {isRegisteringBiometric ? t("dialog.saving") : t("settings.registerBiometric")}
                    </Button>
                  )}
                  
                  {settings?.biometricEnabled === 1 && (
                    <p className="text-sm text-muted-foreground">
                      ✓ Biometric registered
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 shadcn-card">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <CardTitle className="text-base">
                {t("settings.shareLanCardTitle")}
              </CardTitle>
            </div>
            <CardDescription>
              {t("settings.shareLanCardDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5 pt-0">
            <Label htmlFor="share-base-url" className="text-sm">
              {t("settings.shareBaseUrlLabel")}
            </Label>
            <Input
              id="share-base-url"
              value={shareBaseUrlInput}
              onChange={(event) => {
                setShareBaseUrlInput(event.target.value);
                setHasChanges(true);
              }}
              placeholder="http://192.168.1.21:5000"
              aria-invalid={shareBaseUrlInvalid}
              className={shareBaseUrlInvalid ? "border-destructive focus-visible:ring-destructive" : ""}
              data-testid="input-share-base-url"
            />
            {shareBaseUrlInvalid && (
              <p className="text-xs text-destructive">
                {t("settings.shareUrlInvalidHint")}
              </p>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Save/Cancel/Reset Buttons */}
      <Card className="shadcn-card">
        <CardContent className="p-2.5 sm:p-3">
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Button
              variant="outline"
              onClick={handleResetToDefaults}
              data-testid="button-reset-settings"
            >
              {t("settings.resetToDefaults")}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancelChanges}
              disabled={!hasChanges}
              data-testid="button-cancel-settings"
            >
              {t("settings.cancelChanges")}
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={!hasChanges || updateSettingsMutation.isPending}
              data-testid="button-save-settings"
            >
              {updateSettingsMutation.isPending 
                ? t("settings.savingSettings") 
                : t("settings.saveSettings")}
            </Button>
          </div>
          {hasChanges && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              {t("settings.unsavedChanges")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Auto-Save Manager */}
      <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-muted/40" />}>
        <AutoSaveManager />
      </Suspense>

      {/* System Health Monitor */}
      <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-muted/40" />}>
        <SystemHealthMonitor />
      </Suspense>

      {/* Data Backup Manager */}
      <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-muted/40" />}>
        <BackupManager />
      </Suspense>

      {/* Auto Backup Viewer */}
      <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-muted/40" />}>
        <AutoBackupViewer />
      </Suspense>

      {/* Backup Cleanup */}
      <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-muted/40" />}>
        <BackupCleanup />
      </Suspense>

      {/* System Statistics */}
      <Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-muted/40" />}>
        <SystemStats />
      </Suspense>

      {/* Portfolio Checkpoints */}
      <CheckpointsManager />

      {/* Danger Zone - Reset Portfolio */}
      <Card className="border-destructive/50 shadcn-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {t("settings.dangerZone")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 border border-destructive/30 rounded-lg bg-destructive/5">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-foreground">
                {t("settings.resetAllDataTitle")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("settings.resetAllDataDesc")}
              </p>
            </div>
            <Suspense fallback={<div className="h-10 w-24 rounded-md bg-muted/40" />}>
              <ResetPortfolioDialog 
                open={showResetDialog} 
                onOpenChange={setShowResetDialog}
              />
            </Suspense>
            <Button 
              variant="destructive"
              onClick={() => setShowResetDialog(true)}
              data-testid="button-reset-portfolio"
            >
              {t("settings.resetPortfolio")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit Platform Dialog */}
      <AlertDialog open={!!platformToEdit} onOpenChange={(open) => !open && setPlatformToEdit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" />
              <AlertDialogTitle>{t("settings.editPlatform")}</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>{t("settings.editPlatformDesc")}</p>
                <div className="space-y-2">
                  <Label className="text-sm">{t("settings.platformName")}</Label>
                  <Input
                    value={editPlatformName}
                    onChange={(e) => setEditPlatformName(e.target.value)}
                    placeholder={t("settings.platformNamePlaceholder")}
                    data-testid="input-edit-platform-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">
                    {t("settings.feePercentage")}
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={editPlatformFeePercentage}
                    onChange={(e) => setEditPlatformFeePercentage(e.target.value)}
                    placeholder="0"
                    data-testid="input-edit-platform-fee"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm">
                    {t("settings.deductFeesFromProfit")}
                  </Label>
                  <Switch
                    checked={editPlatformDeductFees}
                    onCheckedChange={setEditPlatformDeductFees}
                    data-testid="switch-edit-platform-deduct-fees"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-edit-platform">
              {t("dialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => platformToEdit && updatePlatformMutation.mutate({ 
                id: platformToEdit.id, 
                name: editPlatformName,
                feePercentage: parseFloat(editPlatformFeePercentage) || 0,
                deductFees: editPlatformDeductFees ? 1 : 0
              })}
              disabled={updatePlatformMutation.isPending || !editPlatformName.trim()}
              data-testid="button-confirm-edit-platform"
            >
              {updatePlatformMutation.isPending ? t("dialog.saving") : t("dialog.save")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Platform Confirmation Dialog */}
      <AlertDialog open={!!platformToDelete} onOpenChange={(open) => !open && setPlatformToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <AlertDialogTitle>{t("settings.deletePlatform")}</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>{t("settings.deletePlatformConfirm")}</p>
                {platformToDelete && (
                  <p className="font-semibold text-foreground">
                    {platformToDelete.name}
                  </p>
                )}
                <p className="text-destructive">{t("settings.deletePlatformWarning")}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-platform">
              {t("dialog.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => platformToDelete && deletePlatformMutation.mutate(platformToDelete.id)}
              disabled={deletePlatformMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-platform"
            >
              {deletePlatformMutation.isPending ? t("dialog.deleting") : t("dialog.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
