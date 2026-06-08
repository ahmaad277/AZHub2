import {
  computeSummaryMetricsAndBreakdown,
  getDashboardMetrics,
  getPlatformBreakdown,
} from "@/lib/finance/metrics";
import { fetchMonthlyCashflowSummary } from "@/lib/server/dashboard-summary-data";
import { desc } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { alerts } from "@/db/schema";

const DEFAULT_DASHBOARD_REVALIDATE_SECONDS =
  process.env.NODE_ENV === "development" ? 5 : 300;

const dashboardRevalidateSeconds = Number(
  process.env.DASHBOARD_METRICS_REVALIDATE_SECONDS ??
    DEFAULT_DASHBOARD_REVALIDATE_SECONDS,
);

export const getCachedMetrics = unstable_cache(
  async (platformId?: string) =>
    getDashboardMetrics({ platformId }),
  ["dashboard-metrics"],
  { tags: ["dashboard-metrics"], revalidate: dashboardRevalidateSeconds },
);

export const getCachedBreakdown = unstable_cache(
  async () => getPlatformBreakdown(),
  ["dashboard-breakdown"],
  { tags: ["dashboard-metrics"], revalidate: dashboardRevalidateSeconds },
);

/** Same math as computeSummaryMetricsAndBreakdown; shared cache tag with /api/dashboard/metrics. */
export const getCachedSummaryCompute = unstable_cache(
  async (platformId: string | undefined) =>
    computeSummaryMetricsAndBreakdown({ platformId }),
  ["dashboard-summary-compute"],
  { tags: ["dashboard-metrics"], revalidate: dashboardRevalidateSeconds },
);

/**
 * Pending cashflows from start of calendar month (UTC), grouped for dashboard charts.
 * `monthKey` must be `YYYY-MM` in UTC so the cache rolls forward when the month changes.
 */
export const getCachedMonthlyCashflowSummary = unstable_cache(
  async (scopeKey: string, monthKey: string) => {
    // monthKey is passed by the caller to force cache-invalidation when the month rolls over.
    // eslint-disable-next-line no-void
    void monthKey;
    const platformId = scopeKey === "all" ? undefined : scopeKey;
    return fetchMonthlyCashflowSummary(platformId);
  },
  ["dashboard-monthly-cashflow-summary-v2"],
  { tags: ["dashboard-metrics"], revalidate: dashboardRevalidateSeconds },
);

/** Alerts list — same invalidation tag as dashboard metrics when portfolio data changes. */
export const getCachedAlertsList = unstable_cache(
  async () => db.select().from(alerts).orderBy(desc(alerts.createdAt)),
  ["alerts-list"],
  { tags: ["dashboard-metrics"], revalidate: dashboardRevalidateSeconds },
);
