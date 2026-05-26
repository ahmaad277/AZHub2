import { NextRequest } from "next/server";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { getDashboardMetrics, getPlatformBreakdown } from "@/lib/finance/metrics";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get("platformId");
    const includeBreakdown = searchParams.get("breakdown") === "true";

    const pid = platformId && platformId !== "all" ? platformId : undefined;
    const metrics = await getDashboardMetrics({ platformId: pid });

    if (includeBreakdown) {
      const breakdown = await getPlatformBreakdown();
      return { metrics, breakdown };
    }
    return { metrics };
  }, "GET /api/dashboard/metrics");
}
