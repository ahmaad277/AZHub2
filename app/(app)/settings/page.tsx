"use client";

import * as React from "react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useApp } from "@/components/providers";

export default function SettingsPage() {
  const { t, settings, setSettings } = useApp();
  const { setTheme } = useTheme();
  const [target, setTarget] = React.useState<string>(
    settings.targetCapital2040 ?? "",
  );
  const [alertDays, setAlertDays] = React.useState(settings.alertDaysBefore);

  const save = async (partial: Parameters<typeof setSettings>[0]) => {
    try {
      await setSettings(partial);
      toast.success(t("form.save"));
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <CollapsibleSection id="settings-appearance" title="Appearance">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("settings.language")}</Label>
            <Select
              value={settings.language}
              onValueChange={(v) => save({ language: v as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">العربية</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("settings.theme")}</Label>
            <Select
              value={settings.theme}
              onValueChange={(v) => {
                setTheme(v);
                save({ theme: v as any });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dark">Dark</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="system">System</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("settings.viewMode")}</Label>
            <Select
              value={settings.viewMode}
              onValueChange={(v) => save({ viewMode: v as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pro">{t("common.proMode")}</SelectItem>
                <SelectItem value="lite">{t("common.liteMode")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("settings.fontSize")}</Label>
            <Select
              value={settings.fontSize}
              onValueChange={(v) => save({ fontSize: v as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="settings-goals" title="Goals & Currency">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("settings.target2040")}</Label>
            <Input
              type="number"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              onBlur={() =>
                save({
                  targetCapital2040: target.trim() === "" ? null : target,
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>{t("settings.currency")}</Label>
            <Select
              value={settings.currency}
              onValueChange={(v) => save({ currency: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SAR">SAR</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="AED">AED</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="settings-alerts" title={t("settings.alerts")}>
        <div className="flex items-center gap-4">
          <Switch
            checked={settings.alertsEnabled}
            onCheckedChange={(v) => save({ alertsEnabled: v })}
          />
          <span className="text-sm">Enabled</span>
        </div>
        <div className="mt-3 space-y-2">
          <Label>Days before</Label>
          <Input
            type="number"
            min={0}
            max={365}
            value={alertDays}
            onChange={(e) => setAlertDays(Number(e.target.value))}
            onBlur={() => save({ alertDaysBefore: alertDays })}
            className="max-w-xs"
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection id="settings-share" title={t("settings.shareLinks")}>
        <ShareLinksManager />
      </CollapsibleSection>
    </div>
  );
}
