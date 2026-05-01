import {
  computeSummaryMetricsAndBreakdown,
  getDashboardMetrics,
  getPlatformBreakdown,
} from "@/lib/finance/metrics";
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
