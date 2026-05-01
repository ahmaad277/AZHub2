import { NextRequest } from "next/server";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import {
  getCachedBreakdown,
  getCachedMetrics,
} from "@/lib/server/dashboard-metrics-cache";
import {
  fetchCashflowsGet,
  fetchInvestmentsGet,
  fetchMonthlyCashflowSummary,
  fetchPlatformsList,
} from "@/lib/server/dashboard-summary-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();

    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get("platformId");
    const pid = platformId && platformId !== "all" ? platformId : undefined;

    // Two concurrent DB operations at a time — matches postgres.js pool (max:2)
    // and avoids starting all six fetches before any finish (pool queuing).
    const [platforms, investments] = await Promise.all([
      fetchPlatformsList(),
      fetchInvestmentsGet({
        platformId,
        needsReviewOnly: false,
        limit: 6,
        page: 1,
      }),
    ]);

    const [cashflowsUpcoming, monthlySummary] = await Promise.all([
      fetchCashflowsGet({
        platformId,
        status: "pending",
        from: null,
        to: null,
        limit: 6,
        page: 1,
      }),
      fetchMonthlyCashflowSummary(platformId),
    ]);

    const [metrics, breakdown] = await Promise.all([
      getCachedMetrics(pid),
      getCachedBreakdown(),
    ]);

    return {
      platforms,
      investments,
      cashflowsUpcoming,
      monthlySummary,
      metrics,
      breakdown,
    };
  });
}
