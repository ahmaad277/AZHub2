"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "@/components/providers";
import { formatMoney, formatNumber } from "@/lib/finance/money";
import { getPlatformColorOption } from "@/lib/platform-colors";
import { MonthlyChartToggle, type MonthlyChartMode } from "./pie-toggle";

export interface MonthlyCashflowRow {
  month: string;
  total: number;
  platforms: Array<{
    platformId: string;
    platformName: string;
    platformColor: string | null;
    total: number;
  }>;
}

function getCurrentMonthKey() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function buildMonthlyLineRows(
  startMonth: string,
  endMonth: string,
  rowsByMonth: Map<string, Record<string, string | number>>,
) {
  const [startYear, startMonthNumber] = startMonth.split("-").map(Number);
  const [endYear, endMonthNumber] = endMonth.split("-").map(Number);

  if (!startYear || !startMonthNumber || !endYear || !endMonthNumber) {
    return [];
  }

  const rows: Array<Record<string, string | number>> = [];
  let year = startYear;
  let month = startMonthNumber;

  while (year < endYear || (year === endYear && month <= endMonthNumber)) {
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    rows.push(rowsByMonth.get(monthKey) ?? { month: monthKey, total: 0 });

    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return rows;
}

export function MonthlyCashflowChart({ rows }: { rows: MonthlyCashflowRow[] }) {
  const { t, settings } = useApp();
  const [mode, setMode] = React.useState<MonthlyChartMode>("bar");
  const isRtl = settings.language === "ar";

  const prepared = React.useMemo(() => {
    const series = new Map<string, { key: string; name: string; color: string | null }>();
    const chartRows = rows.map((row) => {
      const item: Record<string, string | number> = { month: row.month, total: row.total };
      for (const platform of row.platforms) {
        const key = `p_${platform.platformId.replace(/[^a-zA-Z0-9_]/g, "_")}`;
        series.set(platform.platformId, {
          key,
          name: platform.platformName,
          color: platform.platformColor,
        });
        item[key] = platform.total;
      }
      return item;
    });
    const chartRowsByMonth = new Map(chartRows.map((row) => [String(row.month), row]));
    const currentMonth = getCurrentMonthKey();
    const lastMonth = rows.reduce(
      (latest, row) => (row.month > latest ? row.month : latest),
      currentMonth,
    );
    const lineChartRows = buildMonthlyLineRows(currentMonth, lastMonth, chartRowsByMonth);

    return {
      chartRows,
      lineChartRows,
      seriesList: Array.from(series.values()),
    };
  }, [rows]);

  const visualRows = React.useMemo(
    () => (isRtl ? [...prepared.lineChartRows].reverse() : prepared.lineChartRows),
    [isRtl, prepared.lineChartRows],
  );
  const chartWidth = React.useMemo(
    () =>
      Math.max(
        576,
        (mode === "line" ? prepared.lineChartRows.length : rows.length) * 18,
      ),
    [mode, prepared.lineChartRows.length, rows.length],
  );
  const formatMonthTick = React.useCallback(
    (month: string) => month.replace(/^20(\d{2})-/, "$1-"),
    [],
  );
  const formatYAxisTick = React.useCallback(
    (value: number | string) => formatNumber(Number(value)),
    [],
  );
  const tooltipFormatter = React.useCallback(
    (value: number, name: string) => [
      formatMoney(value, settings.currency),
      name,
    ],
    [settings.currency],
  );
  const labelFormatter = React.useCallback(
    (label: string | number) => `${t("vision.month")}: ${label}`,
    [t],
  );

  const content = (
    <>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-medium">{t("dash.monthlyCashflows")}</div>
          <div className="text-xs text-muted-foreground">{t("dash.monthlyCashflowsHint")}</div>
        </div>
        <MonthlyChartToggle mode={mode} onChange={setMode} />
      </div>
      {rows.length === 0 ? (
        <div className="grid h-56 place-items-center text-sm text-muted-foreground">
          {t("common.empty")}
        </div>
      ) : (
        <div className="overflow-x-auto" dir={isRtl ? "rtl" : "ltr"}>
          <div style={{ minWidth: chartWidth }} className="h-80" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              {mode === "line" ? (
                <LineChart data={visualRows}>
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={formatMonthTick}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={formatYAxisTick}
                  />
                  <Tooltip
                    formatter={tooltipFormatter}
                    labelFormatter={labelFormatter}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      color: "hsl(var(--foreground))",
                      borderRadius: "0.5rem",
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name={t("common.total")}
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 4 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              ) : (
                <BarChart data={visualRows} barSize={14} barCategoryGap={4}>
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={formatMonthTick}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    fontSize={12}
                    tickFormatter={formatYAxisTick}
                  />
                  <Tooltip
                    formatter={tooltipFormatter}
                    labelFormatter={labelFormatter}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      color: "hsl(var(--foreground))",
                      borderRadius: "0.5rem",
                    }}
                    itemStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Legend />
                  {prepared.seriesList.map((platform) => (
                    <Bar
                      key={platform.key}
                      dataKey={platform.key}
                      name={platform.name}
                      stackId="cashflows"
                      fill={getPlatformColorOption(platform.color).chartColor}
                      isAnimationActive={false}
                    />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </>
  );

  const containerClass = "rounded-2xl border border-border/40 bg-card p-5 sm:p-6 shadow-sm";

  return (
    <div className={containerClass}>
      {content}
    </div>
  );
}
