import {
  computeSummaryMetricsAndBreakdown,
  getDashboardMetrics,
  getPlatformBreakdown,
} from "@/lib/finance/metrics";
import { unstable_cache } from "next/cache";

/** One cached DB load for both KPI metrics + platform breakdown (summary page only). */
export const getCachedSummaryMetricsAndBreakdown = unstable_cache(
  async (platformKey: string) => {
    const platformId = platformKey === "all" ? undefined : platformKey;
    return computeSummaryMetricsAndBreakdown({ platformId });
  },
  ["dashboard-summary-metrics-breakdown"],
  { tags: ["dashboard-metrics"], revalidate: 3600 },
);

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
