import {
  computeSummaryMetricsAndBreakdown,
  getDashboardMetrics,
  getPlatformBreakdown,
} from "@/lib/finance/metrics";
import { fetchMonthlyCashflowSummary } from "@/lib/server/dashboard-summary-data";
import { unstable_cache } from "next/cache";

export const getCachedMetrics = unstable_cache(
  async (platformId?: string) =>
    getDashboardMetrics({ platformId }),
  ["dashboard-metrics"],
  { tags: ["dashboard-metrics"], revalidate: 3600 },
);

export const getCachedBreakdown = unstable_cache(
  async () => getPlatformBreakdown(),
  ["dashboard-breakdown"],
  { tags: ["dashboard-metrics"], revalidate: 3600 },
);

/** Same math as computeSummaryMetricsAndBreakdown; shared cache tag with /api/dashboard/metrics. */
export const getCachedSummaryCompute = unstable_cache(
  async (platformId: string | undefined) =>
    computeSummaryMetricsAndBreakdown({ platformId }),
  ["dashboard-summary-compute"],
  { tags: ["dashboard-metrics"], revalidate: 3600 },
);

/**
 * Pending cashflows from start of calendar month (UTC), grouped for dashboard charts.
 * `monthKey` must be `YYYY-MM` in UTC so the cache rolls forward when the month changes.
 */
export const getCachedMonthlyCashflowSummary = unstable_cache(
  async (scopeKey: string, monthKey: string) => {
    void monthKey;
    const platformId = scopeKey === "all" ? undefined : scopeKey;
    return fetchMonthlyCashflowSummary(platformId);
  },
  ["dashboard-monthly-cashflow-summary"],
  { tags: ["dashboard-metrics"], revalidate: 3600 },
);
