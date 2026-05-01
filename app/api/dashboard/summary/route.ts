import { NextRequest } from "next/server";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import {
  getCachedMonthlyCashflowSummary,
  getCachedSummaryCompute,
} from "@/lib/server/dashboard-metrics-cache";
import { fetchCashflowsGet, fetchInvestmentsGet } from "@/lib/server/dashboard-summary-data";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();

    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get("platformId");
    const pid = platformId && platformId !== "all" ? platformId : undefined;
    const monthlyScope = platformId && platformId !== "all" ? platformId : "all";
    const monthKeyUtc = new Date().toISOString().slice(0, 7);

    // Cached metrics+breakdown (same tag as /api/dashboard/metrics invalidations) runs in
    // parallel with dashboard previews so wall time ≈ max(branch) not sum(branch).
    const [{ metrics, breakdown, platforms }, investments, cashflowsUpcoming, monthlySummary] =
      await Promise.all([
        getCachedSummaryCompute(pid),
        fetchInvestmentsGet({
          platformId,
          needsReviewOnly: false,
          limit: 6,
          page: 1,
          skipTotalCount: true,
        }),
        fetchCashflowsGet({
          platformId,
          status: "pending",
          from: null,
          to: null,
          limit: 6,
          page: 1,
          skipAggregate: true,
        }),
        getCachedMonthlyCashflowSummary(monthlyScope, monthKeyUtc),
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
