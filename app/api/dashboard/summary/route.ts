import { NextRequest } from "next/server";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { computeSummaryMetricsAndBreakdown } from "@/lib/finance/metrics";
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

    // Run heavy metrics+ breakdown first so it does not compete with preview queries
    // for the small postgres pool (see db/index.ts).
    const { metrics, breakdown } = await computeSummaryMetricsAndBreakdown({
      platformId: pid,
    });

    const [platforms, investments, cashflowsUpcoming, monthlySummary] =
      await Promise.all([
        fetchPlatformsList(),
        fetchInvestmentsGet({
          platformId,
          needsReviewOnly: false,
          limit: 6,
          page: 1,
        }),
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
