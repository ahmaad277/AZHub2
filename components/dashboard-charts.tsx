"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "@/components/providers";
import { formatMoney, formatNumber, formatPercent } from "@/lib/finance/money";
import { getPlatformColorOption } from "@/lib/platform-colors";

type PieMode = "percent" | "count";
type MonthlyChartMode = "bar" | "line";

export interface DashboardBreakdownRow {
  platformId: string;
  platformName: string;
  activePrincipal: number;
  realizedGains: number;
  expectedProfit: number;
  investmentsCount: number;
  defaultedCount: number;
  platformColor: string | null;
}

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

interface DashboardChartsProps {
  breakdown: DashboardBreakdownRow[];
  monthlyRows: MonthlyCashflowRow[];
  activeCount: number;
  lateCount: number;
  defaultedCount: number;
  completedCount: number;
}

export function DashboardCharts({
  breakdown,
  monthlyRows,
  activeCount,
  lateCount,
  defaultedCount,
  completedCount,
}: DashboardChartsProps) {
  const { t } = useApp();
  const platformPieData = React.useMemo(
    () =>
      breakdown.map((row) => ({
        id: row.platformId,
        name: row.platformName,
        value: row.investmentsCount,
        color: row.platformColor,
      })),
    [breakdown],
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <PlatformPieCard title={t("dash.platformDistribution")} data={platformPieData} />
        <StatusPieCard
          title={t("dash.platformStatus")}
          activeCount={activeCount}
          lateCount={lateCount}
          defaultedCount={defaultedCount}
          completedCount={completedCount}
        />
      </div>
      <MonthlyCashflowChart rows={monthlyRows} />
    </>
  );
}

function PieToggle({
  mode,
  onChange,
}: {
  mode: PieMode;
  onChange: (next: PieMode) => void;
}) {
  const { t } = useApp();
  return (
    <div className="flex rounded-lg border p-0.5 text-xs">
      {(["percent", "count"] as const).map((value) => (
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

function MonthlyChartToggle({
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

function PieLegend({
  items,
  total,
  mode,
}: {
  items: Array<{ id: string; name: string; value: number; color: string }>;
  total: number;
  mode: PieMode;
}) {
  return (
    <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs [@media(orientation:landscape)_and_(max-height:500px)]:flex [@media(orientation:landscape)_and_(max-height:500px)]:flex-wrap [@media(orientation:landscape)_and_(max-height:500px)]:justify-center">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-2 [@media(orientation:landscape)_and_(max-height:500px)]:justify-center">
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border"
              style={{ backgroundColor: item.color }}
            />
            <span className="truncate [@media(orientation:landscape)_and_(max-height:500px)]:hidden">{item.name}</span>
          </span>
          <span className="tabular-nums text-muted-foreground [@media(orientation:landscape)_and_(max-height:500px)]:hidden">
            {mode === "percent" && total > 0
              ? formatPercent((item.value / total) * 100, 0)
              : formatNumber(item.value)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function PlatformPieCard({
  title,
  data,
}: {
  title: string;
  data: Array<{ id: string; name: string; value: number; color: string | null }>;
}) {
  const { t } = useApp();
  const [mode, setMode] = React.useState<PieMode>("percent");
  const filtered = React.useMemo(
    () =>
      data
        .filter((item) => item.value > 0)
        .map((item) => ({ ...item, fill: getPlatformColorOption(item.color).chartColor })),
    [data],
  );
  const total = React.useMemo(
    () => filtered.reduce((sum, item) => sum + item.value, 0),
    [filtered],
  );
  const legendItems = React.useMemo(
    () =>
      filtered.map((item) => ({
        id: item.id,
        name: item.name,
        value: item.value,
        color: item.fill,
      })),
    [filtered],
  );
  const tooltipFormatter = React.useCallback(
    (value: number, name: string) => [
      mode === "percent" && total > 0
        ? formatPercent((Number(value) / total) * 100, 1)
        : formatNumber(value),
      name,
    ],
    [mode, total],
  );

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-5 text-card-foreground shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),_0_8px_24px_-8px_rgba(0,0,0,0.05)]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium">{title}</div>
        <PieToggle mode={mode} onChange={setMode} />
      </div>
      {filtered.length === 0 ? (
        <div className="grid h-40 place-items-center text-sm text-muted-foreground sm:h-56">
          {t("common.empty")}
        </div>
      ) : (
        <>
          <div className="h-36 sm:h-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={filtered}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={0}
                  outerRadius="80%"
                  paddingAngle={1}
                  isAnimationActive={false}
                >
                  {filtered.map((entry) => (
                    <Cell key={entry.id} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={tooltipFormatter} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <PieLegend items={legendItems} total={total} mode={mode} />
        </>
      )}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  late: "#f59e0b",
  defaulted: "#ef4444",
  completed: "#94a3b8",
};

function StatusPieCard({
  title,
  activeCount,
  lateCount,
  defaultedCount,
  completedCount,
}: {
  title: string;
  activeCount: number;
  lateCount: number;
  defaultedCount: number;
  completedCount: number;
}) {
  const { t } = useApp();
  const [mode, setMode] = React.useState<PieMode>("percent");
  const data = React.useMemo(
    () =>
      [
        { id: "active", name: t("status.active"), value: activeCount },
        { id: "late", name: t("status.late"), value: lateCount },
        { id: "defaulted", name: t("status.defaulted"), value: defaultedCount },
        { id: "completed", name: t("status.completed"), value: completedCount },
      ].filter((item) => item.value > 0),
    [activeCount, completedCount, defaultedCount, lateCount, t],
  );
  const total = React.useMemo(
    () => data.reduce((sum, item) => sum + item.value, 0),
    [data],
  );
  const legendItems = React.useMemo(
    () =>
      data.map((item) => ({
        id: item.id,
        name: item.name,
        value: item.value,
        color: STATUS_COLORS[item.id],
      })),
    [data],
  );
  const tooltipFormatter = React.useCallback(
    (value: number, name: string) => [
      mode === "percent" && total > 0
        ? formatPercent((Number(value) / total) * 100, 1)
        : formatNumber(value),
      name,
    ],
    [mode, total],
  );

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-5 text-card-foreground shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),_0_8px_24px_-8px_rgba(0,0,0,0.05)]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium">{title}</div>
        <PieToggle mode={mode} onChange={setMode} />
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
                    <Cell key={entry.id} fill={STATUS_COLORS[entry.id]} />
                  ))}
                </Pie>
                <Tooltip formatter={tooltipFormatter} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <PieLegend items={legendItems} total={total} mode={mode} />
        </>
      )}
    </div>
  );
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

function MonthlyCashflowChart({ rows }: { rows: MonthlyCashflowRow[] }) {
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

  const visualChartRows = React.useMemo(
    () => (isRtl ? [...prepared.chartRows].reverse() : prepared.chartRows),
    [isRtl, prepared.chartRows],
  );
  const visualLineChartRows = React.useMemo(
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

  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 sm:p-5 text-card-foreground shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),_0_8px_24px_-8px_rgba(0,0,0,0.05)]">
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
                <LineChart data={visualLineChartRows}>
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
                <BarChart data={visualChartRows} barSize={14} barCategoryGap={4}>
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
                  />
                  <Legend />
                  {prepared.seriesList.map((platform) => (
                    <Bar
                      key={platform.key}
                      dataKey={platform.key}
                      name={platform.name}
                      stackId="cashflows"
                      fill={getPlatformColorOption(platform.color).chartColor}
                      radius={[4, 4, 0, 0]}
                      isAnimationActive={false}
                    />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
