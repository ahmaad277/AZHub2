"use client";

import * as React from "react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import Link from "next/link";
import { Archive, BellRing, Link2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CollapsibleSection } from "@/components/collapsible-section";
import { ShareLinksManager } from "@/components/share-links-manager";
import { SettingsCard, SettingsRow } from "@/components/settings-row";
import { useApp } from "@/components/providers";

const SELECT_TRIGGER_CLASS = "h-9 w-[8.5rem]";

export default function SettingsPage() {
  const { t, settings, setSettings } = useApp();
  const { setTheme } = useTheme();
  const [alertDays, setAlertDays] = React.useState(settings.alertDaysBefore);

  React.useEffect(() => {
    setAlertDays(settings.alertDaysBefore);
  }, [settings.alertDaysBefore]);

  const save = async (partial: Parameters<typeof setSettings>[0]) => {
    try {
      await setSettings(partial);
      toast.success(t("form.save"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3">
      <SettingsCard title={t("settings.display")} icon={<Palette />}>
        <SettingsRow label={t("settings.language")}>
          <Select value={settings.language} onValueChange={(v) => save({ language: v as "ar" | "en" })}>
            <SelectTrigger className={SELECT_TRIGGER_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ar">العربية</SelectItem>
              <SelectItem value="en">English</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>

        <SettingsRow label={t("settings.theme")}>
          <Select
            value={settings.theme}
            onValueChange={(v) => {
              setTheme(v);
              save({ theme: v as "dark" | "light" | "system" });
            }}
          >
            <SelectTrigger className={SELECT_TRIGGER_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dark">{t("settings.themeDark")}</SelectItem>
              <SelectItem value="light">{t("settings.themeLight")}</SelectItem>
              <SelectItem value="system">{t("settings.themeSystem")}</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>

        <SettingsRow label={t("settings.viewMode")}>
          <Select
            value={settings.viewMode}
            onValueChange={(v) => save({ viewMode: v as "pro" | "lite" })}
          >
            <SelectTrigger className={SELECT_TRIGGER_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pro">{t("common.proMode")}</SelectItem>
              <SelectItem value="lite">{t("common.liteMode")}</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>

        <SettingsRow label={t("settings.fontSize")}>
          <Select
            value={settings.fontSize}
            onValueChange={(v) => save({ fontSize: v as "small" | "medium" | "large" })}
          >
            <SelectTrigger className={SELECT_TRIGGER_CLASS}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">{t("settings.fontSmall")}</SelectItem>
              <SelectItem value="medium">{t("settings.fontMedium")}</SelectItem>
              <SelectItem value="large">{t("settings.fontLarge")}</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsCard>

      <SettingsCard title={t("settings.alerts")} icon={<BellRing />}>
        <SettingsRow label={t("settings.enabled")} description={t("settings.alertsDescription")}>
          <Switch
            checked={settings.alertsEnabled}
            onCheckedChange={(v) => save({ alertsEnabled: v })}
          />
        </SettingsRow>

        {settings.alertsEnabled ? (
          <SettingsRow label={t("settings.daysBefore")}>
            <Input
              type="number"
              min={0}
              max={365}
              value={alertDays}
              onChange={(e) => setAlertDays(Number(e.target.value))}
              onBlur={() => save({ alertDaysBefore: alertDays })}
              className="h-9 w-20 text-center"
            />
          </SettingsRow>
        ) : null}
      </SettingsCard>

      <CollapsibleSection
        id="settings-data-sharing"
        title={
          <span className="inline-flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            {t("settings.dataAndSharing")}
          </span>
        }
        description={t("settings.dataAndSharingDescription")}
        defaultOpen={false}
        compact
      >
        <div className="space-y-4">
          <ShareLinksManager />

          <div className="overflow-hidden rounded-lg border border-border/60">
            <SettingsRow label={t("nav.snapshots")} className="border-b-0">
              <Button asChild variant="outline" size="sm" className="h-9 gap-1.5">
                <Link href="/snapshots">
                  <Archive className="h-3.5 w-3.5" />
                  {t("settings.openSnapshots")}
                </Link>
              </Button>
            </SettingsRow>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
