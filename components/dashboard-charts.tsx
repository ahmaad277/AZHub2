"use client";

import * as React from "react";
import { useApp } from "@/components/providers";
import { PlatformPieCard } from "./charts/platform-pie-card";
import { StatusPieCard } from "./charts/status-pie-card";
import { MonthlyCashflowChart } from "./charts/monthly-cashflow-chart";
import type { MonthlyCashflowRow } from "./charts/monthly-cashflow-chart";

export type { PieMode, MonthlyChartMode } from "./charts/pie-toggle";
export type { MonthlyCashflowRow } from "./charts/monthly-cashflow-chart";
export { PieToggle, MonthlyChartToggle } from "./charts/pie-toggle";
export { PieLegend } from "./charts/pie-legend";
export { PieCard } from "./charts/pie-card";
export type { PieCardItem } from "./charts/pie-card";
export { PlatformPieCard } from "./charts/platform-pie-card";
export { StatusPieCard } from "./charts/status-pie-card";
export { MonthlyCashflowChart } from "./charts/monthly-cashflow-chart";

export interface DashboardBreakdownRow {
  platformId: string;
  platformName: string;
  activePrincipal: number;
  realizedGains: number;
  expectedProfit: number;
  investmentsCount: number;
  defaultedCount: number;
  platformColor: string | null;
  /** Sum of principal_amount for all investments on this platform (pie «percent» weight). */
  investmentsPrincipalTotal: number;
  /** Sum of principal_amount for active+late+defaulted investments on this platform (current exposure). */
  investmentsPrincipalActive: number;
}

interface DashboardChartsProps {
  breakdown: DashboardBreakdownRow[];
  monthlyRows: MonthlyCashflowRow[];
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
}

export const DashboardCharts = React.memo(function DashboardCharts({
  breakdown,
  monthlyRows,
  activeCount,
  lateCount,
  defaultedCount,
  completedCount,
  principalByStatus,
}: DashboardChartsProps) {
  const { t } = useApp();
  const platformPieData = React.useMemo(
    () =>
      breakdown.map((row) => ({
        id: row.platformId,
        name: row.platformName,
        count: row.investmentsCount,
        weight: row.investmentsPrincipalActive,
        historicalWeight: row.investmentsPrincipalTotal,
        color: row.platformColor,
      })),
    [breakdown],
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <PlatformPieCard
          title={t("dash.platformDistribution")}
          data={platformPieData}
          explanation={t("explain.platformDistribution")}
        />
        <StatusPieCard
          title={t("dash.platformStatus")}
          activeCount={activeCount}
          lateCount={lateCount}
          defaultedCount={defaultedCount}
          completedCount={completedCount}
          principalByStatus={principalByStatus}
          explanation={t("explain.platformStatus")}
        />
      </div>
      <MonthlyCashflowChart
        rows={monthlyRows}
      />
    </>
  );
});
