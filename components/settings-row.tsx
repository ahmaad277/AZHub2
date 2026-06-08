"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SettingsRowProps {
  label: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export function SettingsRow({
  label,
  description,
  children,
  disabled,
  className,
}: SettingsRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-border/60 px-4 py-2.5 last:border-b-0",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium leading-tight">{label}</div>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

interface SettingsCardProps {
  title: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SettingsCard({ title, icon, children, className }: SettingsCardProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      <header className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
        {icon ? (
          <span className="text-muted-foreground [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        ) : null}
        <h3 className="text-sm font-semibold leading-none">{title}</h3>
      </header>
      <div>{children}</div>
    </section>
  );
}
