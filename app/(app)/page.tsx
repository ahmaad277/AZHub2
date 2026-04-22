"use client";

import Link from "next/link";
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
import { CollapsibleSection } from "@/components/collapsible-section";
import { useApp } from "@/components/providers";
import { api } from "@/lib/fetcher";
import type { DashboardMetrics } from "@/lib/finance/metrics";
import { formatMoney, formatNumber } from "@/lib/finance/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface MetricsResponse {
  metrics: DashboardMetrics;
  breakdown?: Array<{
    platformId: string;
    platformName: string;
    activePrincipal: number;
    realizedGains: number;
    expectedProfit: number;
    investmentsCount: number;
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
  platform?: { name: string } | null;
}

interface CashflowRow {
  id: string;
  amount: string;
  dueDate: string;
  type: "profit" | "principal";
  status: "pending" | "received";
  investment: { id: string; name: string; platform?: { name: string } | null };
}

export default function DashboardPage() {
  const { t, settings, platformFilter } = useApp();
  const isLite = settings.viewMode === "lite";

  const platformQuery = platformFilter === "all" ? "" : `&platformId=${platformFilter}`;

  const { data, isLoading } = useQuery<MetricsResponse>({
    queryKey: ["metrics", platformFilter],
    queryFn: () =>
      api.get<MetricsResponse>(`/api/dashboard/metrics?breakdown=true${platformQuery}`),
  });

  const { data: invs = [] } = useQuery<InvestmentRow[]>({
    queryKey: ["investments", platformFilter],
    queryFn: () =>
      api.get<InvestmentRow[]>(
        `/api/investments${platformFilter !== "all" ? `?platformId=${platformFilter}` : ""}`,
      ),
  });

  const { data: cfs = [] } = useQuery<CashflowRow[]>({
    queryKey: ["cashflows-upcoming", platformFilter],
    queryFn: () =>
      api.get<CashflowRow[]>(
        `/api/cashflows?status=pending${platformQuery}`,
      ),
  });

  const m = data?.metrics;
  const breakdown = data?.breakdown ?? [];

  return (
    <div className="space-y-6">
      {/* KPI Tiles */}
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
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
              ? new Date(m.nextPayment.dueDate).toLocaleDateString()
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
                className="rounded-lg border p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{b.platformName}</div>
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
              className="flex items-center justify-between rounded-lg border p-3 hover:border-primary/40"
            >
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary text-xs font-semibold">
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
                  </div>
                </div>
              </div>
              <div className="text-sm font-semibold tabular-nums">
                {formatMoney(inv.principalAmount, settings.currency)}
              </div>
            </Link>
          ))}
          {invs.length === 0 && !isLoading ? (
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
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div>
                <div className="text-sm font-medium">
                  {cf.investment.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(cf.dueDate).toLocaleDateString()} · {t(`status.${cf.type === "profit" ? "pending" : "pending"}`)} · {cf.type}
                </div>
              </div>
              <div className="text-sm font-semibold tabular-nums">
                {formatMoney(cf.amount, settings.currency)}
              </div>
            </div>
          ))}
          {cfs.length === 0 && !isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {t("common.empty")}
            </div>
          ) : null}
        </div>
      </CollapsibleSection>
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
              / {formatMoney(target, settings.currency)} · {pct.toFixed(1)}%
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
    <div className="rounded-lg border p-4">
      <div className="text-xs font-medium uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums text-primary">
        {formatMoney(value, settings.currency)}
      </div>
    </div>
  );
}
