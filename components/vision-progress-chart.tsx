"use client";

import * as React from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Target } from "lucide-react";
import { useApp } from "@/components/providers";
import { formatDate, formatMoney, formatNumber, formatPercent } from "@/lib/finance/money";
import {
  VISION_TARGET_YEAR,
  buildProjectionSeries,
  type PlanTargetInput,
  type ProjectionPoint,
} from "@/lib/finance/projection";

interface VisionProgressChartProps {
  nav: number;
  target: number;
  /** Historical annual yield in percent. */
  historicalApyPct: number;
  /** What-if annual yield in percent (null hides the series). */
  whatIfApyPct: number | null;
  /** Saved monthly plan rows from `vision_targets`. */
  planTargets: PlanTargetInput[];
  /** Compact mode hides the legend, shrinks padding, and skips reference lines. */
  compact?: boolean;
  /** Optional explicit "now" anchor — falls back to current Date for client-side. */
  now?: Date;
  /** Optional override for goal year. */
  endYear?: number;
}

const COLORS = {
  required: "hsl(var(--muted-foreground))",
  current: "hsl(142 71% 45%)",
  whatIf: "hsl(38 92% 50%)",
  target: "hsl(var(--primary))",
} as const;

export function VisionProgressChart({
  nav,
  target,
  historicalApyPct,
  whatIfApyPct,
  planTargets,
  compact = false,
  now,
  endYear = VISION_TARGET_YEAR,
}: VisionProgressChartProps) {
  const { t, settings } = useApp();
  const locale = settings.language === "ar" ? "ar-SA" : "en-US";
  const isRtl = settings.language === "ar";

  // Anchor to "now" once on mount so SSR ↔ client renders agree on the same axis.
  const startDate = React.useMemo(() => now ?? new Date(), [now]);

  const series = React.useMemo<ProjectionPoint[]>(
    () =>
      buildProjectionSeries({
        navNow: nav,
        target,
        historicalApyPct,
        whatIfApyPct,
        planTargets,
        startDate,
        endYear,
      }),
    [nav, target, historicalApyPct, whatIfApyPct, planTargets, startDate, endYear],
  );

  const noData = series.length === 0;
  const targetUnset = !Number.isFinite(target) || target <= 0;
  const navUnset = !Number.isFinite(nav) || nav <= 0;
  const isEmpty = noData || (targetUnset && navUnset);

  const visualSeries = React.useMemo(
    () => (isRtl ? [...series].reverse() : series),
    [isRtl, series],
  );

  const tickEveryMonths = compact ? 24 : 12;
  const formatMonthTick = React.useCallback(
    (value: string) => {
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return value;
      return formatDate(d, locale, { year: "numeric" });
    },
    [locale],
  );
  const formatYAxisTick = React.useCallback(
    (value: number | string) => formatNumber(Number(value), locale),
    [locale],
  );
  const tooltipFormatter = React.useCallback(
    (value: number | string, name: string) => {
      if (value === null || value === undefined || value === "") return ["—", name];
      const n = typeof value === "string" ? Number(value) : value;
      if (!Number.isFinite(n)) return ["—", name];
      return [formatMoney(n, settings.currency, locale), name];
    },
    [locale, settings.currency],
  );
  const labelFormatter = React.useCallback(
    (label: string | number) => {
      const d = new Date(String(label));
      if (Number.isNaN(d.getTime())) return String(label);
      return formatDate(d, locale, {
        year: "numeric",
        month: "short",
      });
    },
    [locale],
  );

  // Axis ticks: keep one tick per N months to avoid overcrowding.
  // (Computed BEFORE any early return to keep hook order stable.)
  const ticks = React.useMemo(() => {
    if (series.length === 0) return [] as string[];
    const out: string[] = [];
    for (let i = 0; i < series.length; i += tickEveryMonths) {
      out.push(series[i].month);
    }
    if (out[out.length - 1] !== series[series.length - 1].month) {
      out.push(series[series.length - 1].month);
    }
    return out;
  }, [series, tickEveryMonths]);

  const containerClass =
    "rounded-2xl border border-border/40 bg-card shadow-sm " +
    (compact ? "p-4" : "p-5 sm:p-6");

  if (isEmpty) {
    return (
      <div className={containerClass}>
        <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
          <Target className="h-4 w-4" />
          {t("vision.chart.title")}
        </div>
        <div
          className={
            "grid place-items-center text-sm text-muted-foreground " +
            (compact ? "h-32" : "h-48")
          }
        >
          {t("vision.chart.empty")}
        </div>
      </div>
    );
  }

  const lastPoint = series[series.length - 1];
  const requiredCagrPct =
    !navUnset && target > nav && series.length > 1
      ? (Math.pow(target / nav, 1 / ((series.length - 1) / 12)) - 1) * 100
      : 0;
  const gapPct = requiredCagrPct - historicalApyPct;

  const targetCurrent = lastPoint?.current ?? null;
  const headerSubline =
    !navUnset && !targetUnset && targetCurrent !== null
      ? `${formatMoney(nav, settings.currency, locale)} → ${formatMoney(targetCurrent, settings.currency, locale)} · 2040`
      : null;

  return (
    <div className={containerClass}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Target className="h-4 w-4 text-muted-foreground" />
            {t("vision.chart.title")}
          </div>
          {headerSubline ? (
            <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
              {headerSubline}
            </div>
          ) : null}
        </div>
        {!compact ? (
          <div className="flex flex-wrap gap-2 text-xs">
            {!navUnset && target > nav ? (
              <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-1 tabular-nums">
                {t("vision.requiredCagr")}: {formatPercent(requiredCagrPct, 2, locale)}
              </span>
            ) : null}
            <span className="rounded-full border border-border/60 bg-muted/40 px-2 py-1 tabular-nums">
              {t("metric.historicalAnnualYield")}: {formatPercent(historicalApyPct, 2, locale)}
            </span>
            {!navUnset && target > nav ? (
              <span
                className={
                  "rounded-full border px-2 py-1 tabular-nums " +
                  (gapPct > 0
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400")
                }
              >
                {t("vision.gap")}: {formatPercent(gapPct, 2, locale)}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={compact ? "h-44" : "h-72 sm:h-80"} dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={visualSeries}
            margin={{ top: 8, right: 16, bottom: 4, left: 8 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="month"
              ticks={ticks}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tickFormatter={formatMonthTick}
              minTickGap={16}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={11}
              tickFormatter={formatYAxisTick}
              width={64}
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
            {!compact && !targetUnset ? (
              <ReferenceLine
                y={target}
                stroke={COLORS.target}
                strokeDasharray="4 4"
                strokeOpacity={0.6}
                label={{
                  value: t("vision.target"),
                  position: "insideTopRight",
                  fill: "hsl(var(--muted-foreground))",
                  fontSize: 10,
                }}
              />
            ) : null}
            <Line
              type="monotone"
              dataKey="required"
              name={t("vision.chart.required")}
              stroke={COLORS.required}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="current"
              name={t("vision.chart.current")}
              stroke={COLORS.current}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="whatIf"
              name={t("vision.chart.whatIf")}
              stroke={COLORS.whatIf}
              strokeWidth={2}
              strokeDasharray="2 3"
              dot={false}
              isAnimationActive={false}
              connectNulls={false}
            />
            {!compact ? (
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                iconType="plainline"
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default VisionProgressChart;
