"use client";

import * as React from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useApp } from "@/components/providers";
import { formatPercent, formatNumber } from "@/lib/finance/money";
import { FlipCard } from "@/components/ui/flip-card";
import { cn } from "@/lib/utils";
import { PieToggle, type PieMode } from "./pie-toggle";
import { PieLegend } from "./pie-legend";

export interface PieCardItem {
  id: string;
  name: string;
  value: number;
  color: string;
}

export function PieCard({
  title,
  explanation,
  data,
  total,
  mode,
  onModeChange,
}: {
  title: string;
  explanation?: string;
  data: PieCardItem[];
  total: number;
  mode: PieMode;
  onModeChange: (next: PieMode) => void;
}) {
  const { t } = useApp();

  const legendItems = React.useMemo(
    () =>
      data.map((item) => ({
        id: item.id,
        name: item.name,
        value: item.value,
        color: item.color,
      })),
    [data],
  );

  const tooltipFormatter = React.useCallback(
    (value: number, name: string) => [
      mode === "current" || mode === "historical"
        ? (total > 0 ? formatPercent((Number(value) / total) * 100, 1) : "0%")
        : formatNumber(value),
      name,
    ],
    [mode, total],
  );

  const content = (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-medium whitespace-nowrap">{title}</div>
        <PieToggle mode={mode} onChange={onModeChange} />
      </div>
      {data.length === 0 ? (
        <div className="grid h-40 place-items-center text-sm text-muted-foreground sm:h-56">
          {t("common.empty")}
        </div>
      ) : (
        <>
          <div className="h-36 sm:h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={0}
                  outerRadius="80%"
                  paddingAngle={1}
                  isAnimationActive={false}
                >
                  {data.map((entry) => (
                    <Cell key={entry.id} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={tooltipFormatter}
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    borderColor: "hsl(var(--border))",
                    color: "hsl(var(--foreground))",
                    borderRadius: "0.5rem",
                  }}
                  itemStyle={{ color: "hsl(var(--foreground))" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <PieLegend items={legendItems} total={total} mode={mode} />
        </>
      )}
    </>
  );

  const containerClass = "rounded-2xl border border-border/40 bg-card p-4 sm:p-6 shadow-sm";

  if (explanation) {
    return (
      <FlipCard
        className="h-full"
        frontClassName={containerClass}
        backClassName={cn(containerClass, "flex flex-col items-center justify-center text-center")}
        front={content}
        back={<div className="text-sm text-muted-foreground">{explanation}</div>}
      />
    );
  }

  return (
    <div className={containerClass}>
      {content}
    </div>
  );
}
