"use client";

import * as React from "react";
import { useApp } from "@/components/providers";
import { getPlatformColorOption } from "@/lib/platform-colors";
import { PieCard } from "./pie-card";
import type { PieMode } from "./pie-toggle";

interface PlatformPieCardProps {
  title: string;
  data: Array<{
    id: string;
    name: string;
    count: number;
    weight: number;
    historicalWeight: number;
    color: string | null;
  }>;
  explanation?: string;
}

export function PlatformPieCard({ title, data, explanation }: PlatformPieCardProps) {
  const [mode, setMode] = React.useState<PieMode>("current");

  const filtered = React.useMemo(() => {
    return data
      .map((item) => {
        let value = 0;
        if (mode === "current") value = item.weight;
        else if (mode === "historical") value = item.historicalWeight;
        else if (mode === "count") value = item.count;

        return {
          id: item.id,
          name: item.name,
          value,
          color: getPlatformColorOption(item.color).chartColor,
        };
      })
      .filter((item) => item.value > 0);
  }, [data, mode]);

  const total = React.useMemo(
    () => filtered.reduce((sum, item) => sum + item.value, 0),
    [filtered],
  );

  return (
    <PieCard
      title={title}
      explanation={explanation}
      data={filtered}
      total={total}
      mode={mode}
      onModeChange={setMode}
    />
  );
}
