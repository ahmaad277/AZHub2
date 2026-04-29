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

const summaryTiming = process.env.DASHBOARD_SUMMARY_TIMING === "1";

function logSummary(phase: string, startedAt: number) {
  if (!summaryTiming) return;
  console.log(
    `[dashboard-summary] ${phase} +${Date.now() - startedAt}ms (wall)`,
  );
}

function timed<T>(
  label: string,
  startedAt: number,
  promise: Promise<T>,
): Promise<T> {
  if (!summaryTiming) return promise;
  const t = Date.now();
  return promise.then((value) => {
    console.log(
      `[dashboard-summary] ${label} done +${Date.now() - startedAt}ms wall (${Date.now() - t}ms task)`,
    );
    return value;
  });
}

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    const startedAt = Date.now();
    await requireOwner();
    logSummary("after_requireOwner", startedAt);

    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get("platformId");
    const pid = platformId && platformId !== "all" ? platformId : undefined;

    const [
      platforms,
      investments,
      cashflowsUpcoming,
      monthlySummary,
      metrics,
      breakdown,
    ] = await Promise.all([
      timed("platforms", startedAt, fetchPlatformsList()),
      timed(
        "investments",
        startedAt,
        fetchInvestmentsGet({
          platformId,
          needsReviewOnly: false,
          limit: 6,
          page: 1,
        }),
      ),
      timed(
        "cashflows",
        startedAt,
        fetchCashflowsGet({
          platformId,
          status: "pending",
          from: null,
          to: null,
          limit: 6,
          page: 1,
        }),
      ),
      timed(
        "monthlySummary",
        startedAt,
        fetchMonthlyCashflowSummary(platformId),
      ),
      timed("metrics", startedAt, getCachedMetrics(pid)),
      timed("breakdown", startedAt, getCachedBreakdown()),
    ]);

    logSummary("total_before_response", startedAt);

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
