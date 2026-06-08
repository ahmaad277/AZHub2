"use client";

import * as React from "react";
import { useApp } from "@/components/providers";
import { Activity, History, Hash } from "lucide-react";

export type PieMode = "current" | "historical" | "count";
export type MonthlyChartMode = "bar" | "line";

export function PieToggle({
  mode,
  onChange,
}: {
  mode: PieMode;
  onChange: (next: PieMode) => void;
}) {
  const { t } = useApp();
  const icons = {
    current: Activity,
    historical: History,
    count: Hash,
  };

  return (
    <div className="flex shrink-0 rounded-lg border p-0.5 text-[10px] sm:text-xs">
      {(["current", "historical", "count"] as const).map((value) => {
        const Icon = icons[value];
        return (
          <button
            key={value}
            type="button"
            title={t(`chart.${value}`)}
            className={`flex items-center justify-center rounded px-1.5 py-0.5 transition-colors whitespace-nowrap ${
              mode === value ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
            onClick={() => onChange(value)}
          >
            <Icon className="h-3.5 w-3.5 sm:hidden" />
            <span className="hidden sm:inline">{t(`chart.${value}`)}</span>
          </button>
        );
      })}
    </div>
  );
}

export function MonthlyChartToggle({
  mode,
  onChange,
}: {
  mode: MonthlyChartMode;
  onChange: (next: MonthlyChartMode) => void;
}) {
  const { t } = useApp();
  return (
    <div className="flex rounded-lg border p-0.5 text-xs">
      {(["bar", "line"] as const).map((value) => (
        <button
          key={value}
          type="button"
          className={`rounded px-1.5 py-0.5 transition-colors ${
            mode === value ? "bg-primary text-primary-foreground" : "text-muted-foreground"
          }`}
          onClick={() => onChange(value)}
        >
          {t(`chart.${value}`)}
        </button>
      ))}
    </div>
  );
}
