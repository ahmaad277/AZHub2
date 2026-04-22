"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useApp } from "./providers";
import { formatMoney, formatPercent, formatNumber } from "@/lib/finance/money";

interface Props {
  label: string;
  value: number | string | null | undefined;
  format?: "money" | "percent" | "number" | "days" | "text";
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
  sublabel,
  icon,
  accent = "primary",
  hidden,
  className,
}: Props) {
  const { settings, locale } = useApp();
  if (hidden) return null;
  const localeCode = locale === "ar" ? "ar-SA" : "en-US";

  let display: string = "—";
  if (value === null || value === undefined || value === "") display = "—";
  else if (format === "money") display = formatMoney(value as number, settings.currency, localeCode);
  else if (format === "percent")
    display = formatPercent(Number(value), 2, localeCode);
  else if (format === "days")
    display = `${formatNumber(Number(value), localeCode, 0)} d`;
  else if (format === "number")
    display = formatNumber(Number(value), localeCode, 0);
  else display = String(value);

  return (
    <div
      className={cn(
        "rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-primary/40",
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
      <div className={cn("mt-2 text-2xl font-semibold tabular-nums", ACCENT[accent])}>
        {display}
      </div>
      {sublabel ? (
        <div className="mt-1 text-xs text-muted-foreground">{sublabel}</div>
      ) : null}
    </div>
  );
}
