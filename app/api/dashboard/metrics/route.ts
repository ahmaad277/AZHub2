import { NextRequest } from "next/server";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import {
  getDashboardMetrics,
  getPlatformBreakdown,
} from "@/lib/finance/metrics";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get("platformId");
    const includeBreakdown = searchParams.get("breakdown") === "true";

    const metrics = await getDashboardMetrics({
      platformId: platformId && platformId !== "all" ? platformId : undefined,
    });

    if (includeBreakdown) {
      const breakdown = await getPlatformBreakdown();
      return { metrics, breakdown };
    }
    return { metrics };
  });
}
