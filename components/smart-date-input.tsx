"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  durationFromEndDate,
  endDateFromDuration,
} from "@/lib/finance/date-smart";
import { useApp } from "./providers";

interface Props {
  startDate: string; // yyyy-mm-dd
  durationMonths: number | "";
  endDate: string;
  onChange: (next: {
    startDate: string;
    durationMonths: number | "";
    endDate: string;
  }) => void;
  mode: "duration" | "endDate";
  onModeChange: (mode: "duration" | "endDate") => void;
}

function toIso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function fromIso(s: string) {
  // Treat yyyy-mm-dd as UTC midnight for stable math.
  return new Date(`${s}T00:00:00Z`);
}

export function SmartDateInput({
  startDate,
  durationMonths,
  endDate,
  onChange,
  mode,
  onModeChange,
}: Props) {
  const { t } = useApp();

  const handleStart = (v: string) => {
    if (!v) {
      onChange({ startDate: v, durationMonths, endDate });
      return;
    }
    const start = fromIso(v);
    if (mode === "duration" && typeof durationMonths === "number" && durationMonths > 0) {
      const end = endDateFromDuration(start, durationMonths);
      onChange({ startDate: v, durationMonths, endDate: toIso(end) });
    } else if (mode === "endDate" && endDate) {
      const end = fromIso(endDate);
      const m = durationFromEndDate(start, end);
      onChange({ startDate: v, durationMonths: m, endDate });
    } else {
      onChange({ startDate: v, durationMonths, endDate });
    }
  };

  const handleDuration = (v: string) => {
    const months = v ? parseInt(v, 10) : "";
    if (!startDate || typeof months !== "number" || months <= 0) {
      onChange({ startDate, durationMonths: months, endDate });
      return;
    }
    const start = fromIso(startDate);
    const end = endDateFromDuration(start, months);
    onChange({ startDate, durationMonths: months, endDate: toIso(end) });
  };

  const handleEnd = (v: string) => {
    if (!v) {
      onChange({ startDate, durationMonths, endDate: v });
      return;
    }
    if (!startDate) {
      onChange({ startDate, durationMonths, endDate: v });
      return;
    }
    const start = fromIso(startDate);
    const end = fromIso(v);
    const m = durationFromEndDate(start, end);
    onChange({ startDate, durationMonths: m, endDate: v });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("form.startDate")}</Label>
          <Input
            lang="en"
            type="date"
            value={startDate}
            onChange={(e) => handleStart(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>{t("form.type")}</Label>
          <Tabs value={mode} onValueChange={(v) => onModeChange(v as any)}>
            <TabsList className="w-full">
              <TabsTrigger value="duration" className="flex-1">
                {t("form.durationMonths")}
              </TabsTrigger>
              <TabsTrigger value="endDate" className="flex-1">
                {t("form.endDate")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {mode === "duration" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("form.durationMonths")}</Label>
            <Input
              type="number"
              min={1}
              step={1}
              value={durationMonths}
              onChange={(e) => handleDuration(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">
              {t("form.endDate")} · auto
            </Label>
            <Input lang="en" type="date" value={endDate} disabled />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>{t("form.endDate")}</Label>
            <Input
              lang="en"
              type="date"
              value={endDate}
              onChange={(e) => handleEnd(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground">
              {t("form.durationMonths")} · auto
            </Label>
            <Input type="number" value={durationMonths} disabled />
          </div>
        </div>
      )}
    </div>
  );
}
