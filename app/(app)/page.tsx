"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import {
  Wallet,
  Briefcase,
  TrendingUp,
  Percent,
  AlertTriangle,
  CalendarClock,
  Gauge,
  Target,
  ArrowDownCircle,
} from "lucide-react";
import { MetricTile } from "@/components/metric-tile";
import { useApp } from "@/components/providers";
import { ResolvedIssueBadge } from "@/components/resolved-issue-badge";
import { api } from "@/lib/fetcher";
import type { DashboardMetrics } from "@/lib/finance/metrics";
import { formatDate, formatMoney, formatNumber, formatPercent } from "@/lib/finance/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPlatformColorOption } from "@/lib/platform-colors";

const CollapsibleSection = dynamic(
  () => import("@/components/collapsible-section").then((mod) => mod.CollapsibleSection),
  {
    ssr: false,
    loading: () => null,
  },
);

const DashboardCharts = dynamic(
  () => import("@/components/dashboard-charts").then((mod) => mod.DashboardCharts),
  {
    ssr: false,
    loading: () => <DashboardChartsSkeleton />,
  },
);

interface MetricsResponse {
  metrics: DashboardMetrics;
  breakdown?: Array<{
    platformId: string;
    platformName: string;
    activePrincipal: number;
    realizedGains: number;
    expectedProfit: number;
    investmentsCount: number;
    defaultedCount: number;
    platformColor: string | null;
  }>;
}

interface InvestmentRow {
  id: string;
  name: string;
  principalAmount: string;
  expectedProfit: string;
  endDate: string;
  derivedStatus: "active" | "late" | "defaulted" | "completed";
  needsReview: boolean;
  resolvedIssueStatus?: "late" | "defaulted" | null;
  resolvedIssueDays?: number | null;
  platform?: { name: string; color?: string | null } | null;
}

interface CashflowRow {
  id: string;
  amount: string;
  dueDate: string;
  type: "profit" | "principal";
  status: "pending" | "received";
  investment: {
    id: string;
    name: string;
    platform?: { name: string; color?: string | null } | null;
  };
}

interface RowsResponse<T> {
  rows?: T[];
}

interface MonthlyCashflowResponse {
  rows: Array<{
    month: string;
    total: number;
    platforms: Array<{
      platformId: string;
      platformName: string;
      platformColor: string | null;
      total: number;
    }>;
  }>;
}

export default function DashboardPage() {
  const { t, settings, platformFilter } = useApp();
  const isLite = settings.viewMode === "lite";
  const dateLocale = settings.language === "ar" ? "ar-SA" : "en-US";

  const platformQuery = platformFilter === "all" ? "" : `&platformId=${platformFilter}`;

  const { data, isLoading: metricsLoading } = useQuery<MetricsResponse>({
    queryKey: ["dashboard-metrics", platformFilter, "breakdown"],
    queryFn: () =>
      api.get<MetricsResponse>(`/api/dashboard/metrics?breakdown=true${platformQuery}`),
    placeholderData: (previousData) => previousData,
  });

  const { data: invsData = [], isLoading: invsLoading } = useQuery<
    InvestmentRow[] | RowsResponse<InvestmentRow>
  >({
    queryKey: ["investments", platformFilter],
    queryFn: () =>
      api.get<InvestmentRow[] | RowsResponse<InvestmentRow>>(
        `/api/investments?limit=6${platformFilter !== "all" ? `&platformId=${platformFilter}` : ""}`,
      ),
    placeholderData: (previousData) => previousData,
  });

  const { data: cfsData = [], isLoading: cfsLoading } = useQuery<
    CashflowRow[] | RowsResponse<CashflowRow>
  >({
    queryKey: ["cashflows-upcoming", platformFilter],
    queryFn: () =>
      api.get<CashflowRow[] | RowsResponse<CashflowRow>>(
        `/api/cashflows?status=pending&limit=6${platformQuery}`,
      ),
    placeholderData: (previousData) => previousData,
  });

  const { data: monthlyData, isLoading: monthlyLoading } = useQuery<MonthlyCashflowResponse>({
    queryKey: ["cashflows-monthly-summary", platformFilter],
    queryFn: () =>
      api.get<MonthlyCashflowResponse>(
        `/api/cashflows/monthly-summary${platformFilter !== "all" ? `?platformId=${platformFilter}` : ""}`,
      ),
    placeholderData: (previousData) => previousData,
  });

  const m = data?.metrics;
  const breakdown = data?.breakdown ?? [];
  const invs = Array.isArray(invsData) ? invsData : (invsData.rows ?? []);
  const cfs = Array.isArray(cfsData) ? cfsData : (cfsData.rows ?? []);

  return (
    <div className="space-y-6">
      {/* KPI Tiles */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
        <MetricTile
          label={t("metric.nav")}
          value={m?.nav}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="primary"
        />
        <MetricTile
          label={t("metric.totalCashBalance")}
          value={m?.totalCashBalance}
          icon={<Wallet className="h-4 w-4" />}
          accent="success"
        />
        <MetricTile
          label={t("metric.activePrincipal")}
          value={m?.activePrincipal}
          icon={<Briefcase className="h-4 w-4" />}
          accent="primary"
        />
        <MetricTile
          label={t("metric.realizedGains")}
          value={m?.realizedGains}
          icon={<ArrowDownCircle className="h-4 w-4" />}
          accent="success"
        />
        <MetricTile
          label={t("metric.expectedInflow30")}
          value={m?.expectedInflow30d}
          icon={<CalendarClock className="h-4 w-4" />}
          accent="primary"
        />
        <MetricTile
          label={t("metric.nextPayment")}
          value={m?.nextPayment.amount}
          sublabel={
            m?.nextPayment.dueDate
              ? formatDate(m.nextPayment.dueDate, dateLocale)
              : undefined
          }
          icon={<CalendarClock className="h-4 w-4" />}
          accent="muted"
        />
        <MetricTile
          label={t("metric.cashDrag")}
          value={m?.cashDragPercent}
          format="percent"
          icon={<Gauge className="h-4 w-4" />}
          accent={(m?.cashDragPercent ?? 0) > 30 ? "warning" : "muted"}
          hidden={isLite}
        />
        <MetricTile
          label={t("metric.wam")}
          value={m?.wamDays}
          format="days"
          icon={<CalendarClock className="h-4 w-4" />}
          accent="muted"
          hidden={isLite}
        />
        <MetricTile
          label={t("metric.activeAnnualYield")}
          value={m?.activeAnnualYieldPercent}
          format="percent"
          icon={<Percent className="h-4 w-4" />}
          accent="success"
          hidden={isLite}
        />
        <MetricTile
          label={t("metric.defaultRate")}
          value={m?.defaultRatePercent}
          format="percent"
          icon={<AlertTriangle className="h-4 w-4" />}
          accent={(m?.defaultRatePercent ?? 0) > 0 ? "destructive" : "muted"}
          hidden={isLite}
        />
        <MetricTile
          label={t("metric.overdueBalance")}
          value={m?.overdueBalance}
          icon={<AlertTriangle className="h-4 w-4" />}
          accent={(m?.overdueBalance ?? 0) > 0 ? "destructive" : "muted"}
          hidden={isLite}
        />
        <MetricTile
          label={t("metric.totalExpectedProfit")}
          value={m?.totalExpectedProfit}
          icon={<TrendingUp className="h-4 w-4" />}
          accent="muted"
        />
      </div>

      {metricsLoading || monthlyLoading ? (
        <DashboardChartsSkeleton />
      ) : (
        <DashboardCharts
          breakdown={breakdown}
          monthlyRows={monthlyData?.rows ?? []}
          activeCount={m?.activeCount ?? 0}
          lateCount={m?.lateCount ?? 0}
          defaultedCount={m?.defaultedCount ?? 0}
          completedCount={m?.completedCount ?? 0}
        />
      )}

      {/* Vision 2040 */}
      <CollapsibleSection
        id="vision-progress"
        title={t("dash.vision2040")}
        description={settings.targetCapital2040 ? formatMoney(settings.targetCapital2040, settings.currency) : undefined}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/vision">{t("common.viewAll")}</Link>
          </Button>
        }
      >
        <VisionProgress nav={m?.nav ?? 0} />
      </CollapsibleSection>

      {/* Platform overview */}
      <CollapsibleSection id="platform-overview" title={t("dash.platformOverview")}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {breakdown.length === 0 ? (
            <div className="col-span-full text-sm text-muted-foreground">
              {t("common.empty")}
            </div>
          ) : (
            breakdown.map((b) => (
              <div
                key={b.platformId}
                className="rounded-xl border border-border/50 bg-card p-4 text-card-foreground shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)]"
                style={{
                  borderInlineStartWidth: 4,
                  borderInlineStartColor: getPlatformColorOption(b.platformColor).chartColor,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="inline-block h-2.5 w-2.5 rounded-full border"
                      style={{ backgroundColor: getPlatformColorOption(b.platformColor).chartColor }}
                    />
                    <div className="font-medium">{b.platformName}</div>
                  </div>
                  <Badge variant="outline">{formatNumber(b.investmentsCount)}</Badge>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground">{t("metric.activePrincipal")}</div>
                    <div className="font-semibold tabular-nums">
                      {formatMoney(b.activePrincipal, settings.currency)}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">{t("metric.realizedGains")}</div>
                    <div className="font-semibold tabular-nums">
                      {formatMoney(b.realizedGains, settings.currency)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CollapsibleSection>

      {/* Forecast (simple summary for now) */}
      <CollapsibleSection id="cashflow-forecast" title={t("dash.forecast")}>
        <div className="grid gap-3 md:grid-cols-3">
          <ForecastCard label="30d" value={m?.expectedInflow30d ?? 0} />
          <ForecastCard label="60d" value={m?.expectedInflow60d ?? 0} />
          <ForecastCard label="90d" value={m?.expectedInflow90d ?? 0} />
        </div>
      </CollapsibleSection>

      {/* Recent Investments */}
      <CollapsibleSection
        id="recent-investments"
        title={t("dash.recentInvestments")}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/investments">{t("common.viewAll")}</Link>
          </Button>
        }
      >
        <div className="space-y-2">
          {invs.slice(0, 6).map((inv) => (
            <Link
              key={inv.id}
              href={`/investments?id=${inv.id}`}
              className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-3 text-card-foreground shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)]"
              style={{
                borderInlineStartWidth: 4,
                borderInlineStartColor: getPlatformColorOption(inv.platform?.color).chartColor,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="grid h-9 w-9 place-items-center rounded-md text-xs font-semibold"
                  style={{
                    backgroundColor: `${getPlatformColorOption(inv.platform?.color).chartColor}26`,
                    color: getPlatformColorOption(inv.platform?.color).chartColor,
                  }}
                >
                  {inv.platform?.name?.slice(0, 2) ?? "—"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{inv.name}</span>
                    {inv.needsReview ? (
                      <Badge variant="warning" className="h-5 px-1.5 text-[10px]">
                        {t("common.needsReview")}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {inv.platform?.name} · {t(`status.${inv.derivedStatus}`)}
                    <ResolvedIssueBadge
                      status={inv.resolvedIssueStatus}
                      days={inv.resolvedIssueDays}
                      className="ms-1"
                    />
                  </div>
                </div>
              </div>
              <div className="text-sm font-semibold tabular-nums">
                {formatMoney(inv.principalAmount, settings.currency)}
              </div>
            </Link>
          ))}
          {invsLoading ? (
            <ListSkeleton rows={3} />
          ) : invs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("common.empty")}
            </div>
          ) : null}
        </div>
      </CollapsibleSection>

      {/* Upcoming cashflows */}
      <CollapsibleSection
        id="upcoming-cashflows"
        title={t("dash.upcomingCashflows")}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/cashflows">{t("common.viewAll")}</Link>
          </Button>
        }
      >
        <div className="space-y-2">
          {cfs.slice(0, 6).map((cf) => (
            <div
              key={cf.id}
              className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-3 text-card-foreground shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.08)]"
              style={{
                borderInlineStartWidth: 4,
                borderInlineStartColor: getPlatformColorOption(cf.investment.platform?.color).chartColor,
              }}
            >
              <div>
                <div className="text-sm font-medium">
                  {cf.investment.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(cf.dueDate, dateLocale)} · {t(`status.${cf.type === "profit" ? "pending" : "pending"}`)} · {cf.type}
                </div>
              </div>
              <div className="text-sm font-semibold tabular-nums">
                {formatMoney(cf.amount, settings.currency)}
              </div>
            </div>
          ))}
          {cfsLoading ? (
            <ListSkeleton rows={3} />
          ) : cfs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("common.empty")}
            </div>
          ) : null}
        </div>
      </CollapsibleSection>
    </div>
  );
}

function DashboardChartsSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-[66px] rounded-lg" />
      ))}
    </div>
  );
}

function VisionProgress({ nav }: { nav: number }) {
  const { settings, t } = useApp();
  const target = Number(settings.targetCapital2040 ?? 0);
  const pct = target > 0 ? Math.min(100, (nav / target) * 100) : 0;
  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Target className="h-4 w-4" /> {t("metric.nav")}
        </div>
        <div className="font-semibold tabular-nums">
          {formatMoney(nav, settings.currency)}
          {target > 0 ? (
            <span className="ms-2 text-xs text-muted-foreground">
              / {formatMoney(target, settings.currency)} · {formatPercent(pct, 1)}
            </span>
          ) : null}
        </div>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ForecastCard({ label, value }: { label: string; value: number }) {
  const { settings } = useApp();
  return (
    <div className="rounded-xl border border-border/50 bg-card p-4 text-card-foreground shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)]">
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-primary">
        {formatMoney(value, settings.currency)}
      </div>
    </div>
  );
}
