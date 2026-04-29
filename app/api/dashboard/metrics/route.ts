import { NextRequest } from "next/server";
import { handleRoute } from "@/lib/api";
import { createDbRouteTimer } from "@/lib/db-route-timing";
import { requireOwner } from "@/lib/auth";
import {
  getCachedBreakdown,
  getCachedMetrics,
} from "@/lib/server/dashboard-metrics-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const timer = createDbRouteTimer("GET /api/dashboard/metrics");
    await requireOwner();
    timer.mark("after_requireOwner");
    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get("platformId");
    const includeBreakdown = searchParams.get("breakdown") === "true";

    const pid = platformId && platformId !== "all" ? platformId : undefined;
    const metrics = await getCachedMetrics(pid);
    timer.mark("after_first_db_query");

    if (includeBreakdown) {
      const breakdown = await getCachedBreakdown();
      return { metrics, breakdown };
    }
    return { metrics };
  });
}
