"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useApp } from "./providers";
import { formatMoney, formatPercent, formatNumber } from "@/lib/finance/money";

interface Props {
  label: string;
  value: number | string | null | undefined;
  format?: "money" | "percent" | "number" | "days" | "text";
  valueLabel?: React.ReactNode;
  secondaryLabel?: React.ReactNode;
  secondaryValue?: number | string | null | undefined;
  secondaryFormat?: "money" | "percent" | "number" | "days" | "text";
  sublabel?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: "primary" | "success" | "warning" | "destructive" | "muted";
  hidden?: boolean;
  className?: string;
}

const ACCENT = {
  primary: "text-primary",
  success: "text-[hsl(var(--success))]",
  warning: "text-[hsl(var(--warning))]",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
};

export function MetricTile({
  label,
  value,
  format = "money",
  valueLabel,
  secondaryLabel,
  secondaryValue,
  secondaryFormat,
  sublabel,
  icon,
  accent = "primary",
  hidden,
  className,
}: Props) {
  const { settings, locale } = useApp();
  if (hidden) return null;
  const localeCode = locale === "ar" ? "ar-SA" : "en-US";

  const formatDisplay = (
    rawValue: number | string | null | undefined,
    valueFormat: Props["format"] = "money",
  ) => {
    if (rawValue === null || rawValue === undefined || rawValue === "") return "—";
    if (valueFormat === "money") return formatMoney(rawValue as number, settings.currency, localeCode);
    if (valueFormat === "percent") return formatPercent(Number(rawValue), 2, localeCode);
    if (valueFormat === "days") return `${formatNumber(Number(rawValue), localeCode, 0)} d`;
    if (valueFormat === "number") return formatNumber(Number(rawValue), localeCode, 0);
    return String(rawValue);
  };

  const display = formatDisplay(value, format);
  const secondaryDisplay = formatDisplay(secondaryValue, secondaryFormat ?? format);
  const hasSecondary = secondaryLabel !== undefined || secondaryValue !== undefined;

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/40 bg-card p-5 sm:p-6 shadow-sm transition-all hover:shadow-md hover:border-border/80",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        {icon ? (
          <div className={cn("rounded-lg bg-muted p-1.5", ACCENT[accent])}>
            {icon}
          </div>
        ) : null}
      </div>
      {hasSecondary ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs text-muted-foreground">{valueLabel}</span>
            <span className={cn("text-xl font-bold tracking-tight tabular-nums", ACCENT[accent])}>
              {display}
            </span>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs text-muted-foreground">{secondaryLabel}</span>
            <span className={cn("text-xl font-bold tracking-tight tabular-nums", ACCENT[accent])}>
              {secondaryDisplay}
            </span>
          </div>
        </div>
      ) : (
        <div className={cn("mt-3 text-2xl sm:text-3xl font-bold tracking-tight tabular-nums", ACCENT[accent])}>
          {display}
        </div>
      )}
      {sublabel ? (
        <div className="mt-1 text-xs text-muted-foreground">{sublabel}</div>
      ) : null}
    </div>
  );
}
