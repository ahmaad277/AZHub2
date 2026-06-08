"use client";

import * as React from "react";
import { useApp } from "@/components/providers";
import { PieCard } from "./pie-card";
import type { PieMode } from "./pie-toggle";

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  late: "#f59e0b",
  defaulted: "#ef4444",
  completed: "#94a3b8",
};

interface StatusPieCardProps {
  title: string;
  activeCount: number;
  lateCount: number;
  defaultedCount: number;
  completedCount: number;
  principalByStatus: {
    active: number;
    late: number;
    defaulted: number;
    completed: number;
  };
  explanation?: string;
}

export function StatusPieCard({
  title,
  activeCount,
  lateCount,
  defaultedCount,
  completedCount,
  principalByStatus,
  explanation,
}: StatusPieCardProps) {
  const { t } = useApp();
  const [mode, setMode] = React.useState<PieMode>("current");

  const data = React.useMemo(() => {
    const rows = [
      {
        id: "active",
        name: t("status.active"),
        count: activeCount,
        weight: principalByStatus.active,
        historicalWeight: principalByStatus.active,
      },
      {
        id: "late",
        name: t("status.late"),
        count: lateCount,
        weight: principalByStatus.late,
        historicalWeight: principalByStatus.late,
      },
      {
        id: "defaulted",
        name: t("status.defaulted"),
        count: defaultedCount,
        weight: principalByStatus.defaulted,
        historicalWeight: principalByStatus.defaulted,
      },
      {
        id: "completed",
        name: t("status.completed"),
        count: completedCount,
        weight: 0,
        historicalWeight: principalByStatus.completed,
      },
    ];
    return rows
      .map((item) => {
        let value = 0;
        if (mode === "current") value = item.weight;
        else if (mode === "historical") value = item.historicalWeight;
        else if (mode === "count") value = item.count;

        return {
          id: item.id,
          name: item.name,
          value,
          color: STATUS_COLORS[item.id],
        };
      })
      .filter((item) => item.value > 0);
  }, [
    activeCount,
    completedCount,
    defaultedCount,
    lateCount,
    mode,
    principalByStatus.active,
    principalByStatus.completed,
    principalByStatus.defaulted,
    principalByStatus.late,
    t,
  ]);

  const total = React.useMemo(
    () => data.reduce((sum, item) => sum + item.value, 0),
    [data],
  );

  return (
    <PieCard
      title={title}
      explanation={explanation}
      data={data}
      total={total}
      mode={mode}
      onModeChange={setMode}
    />
  );
}
