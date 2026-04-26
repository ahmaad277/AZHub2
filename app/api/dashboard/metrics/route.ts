import { NextRequest } from "next/server";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import {
  getDashboardMetrics,
  getPlatformBreakdown,
} from "@/lib/finance/metrics";
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";

const getCachedMetrics = unstable_cache(
  async (platformId?: string) =>
    getDashboardMetrics({ platformId }),
  ["dashboard-metrics"],
  { tags: ["dashboard-metrics"], revalidate: 3600 }
);

const getCachedBreakdown = unstable_cache(
  async () => getPlatformBreakdown(),
  ["dashboard-breakdown"],
  { tags: ["dashboard-metrics"], revalidate: 3600 }
);

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get("platformId");
    const includeBreakdown = searchParams.get("breakdown") === "true";

    const pid = platformId && platformId !== "all" ? platformId : undefined;
    const metrics = await getCachedMetrics(pid);

    if (includeBreakdown) {
      const breakdown = await getCachedBreakdown();
      return { metrics, breakdown };
    }
    return { metrics };
  });
}
