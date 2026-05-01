import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { jsonError } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import {
  getCachedMonthlyCashflowSummary,
  getCachedSummaryCompute,
} from "@/lib/server/dashboard-metrics-cache";
import { fetchCashflowsGet, fetchInvestmentsGet } from "@/lib/server/dashboard-summary-data";

export const dynamic = "force-dynamic";

function track<T>(name: string, promise: Promise<T>, timings: Record<string, number>): Promise<T> {
  const start = Date.now();
  return promise.finally(() => {
    timings[name] = Date.now() - start;
  });
}

export async function GET(request: NextRequest) {
  try {
    await requireOwner();

    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get("platformId");
    const pid = platformId && platformId !== "all" ? platformId : undefined;
    const monthlyScope = platformId && platformId !== "all" ? platformId : "all";
    const monthKeyUtc = new Date().toISOString().slice(0, 7);

    const perfTimings = process.env.AZHUB_SERVER_TIMING === "1" ? ({} as Record<string, number>) : null;

    const wrap = perfTimings
      ? <T,>(name: string, p: Promise<T>) => track(name, p, perfTimings)
      : <T,>(_name: string, p: Promise<T>) => p;

    const [{ metrics, breakdown, platforms }, investments, cashflowsUpcoming, monthlySummary] =
      await Promise.all([
        wrap("summary-compute", getCachedSummaryCompute(pid)),
        wrap(
          "summary-investments",
          fetchInvestmentsGet({
            platformId,
            needsReviewOnly: false,
            limit: 6,
            page: 1,
            skipTotalCount: true,
          }),
        ),
        wrap(
          "summary-cashflows",
          fetchCashflowsGet({
            platformId,
            status: "pending",
            from: null,
            to: null,
            limit: 6,
            page: 1,
            skipAggregate: true,
          }),
        ),
        wrap(
          "summary-monthly",
          getCachedMonthlyCashflowSummary(monthlyScope, monthKeyUtc),
        ),
      ]);

    const body = {
      platforms,
      investments,
      cashflowsUpcoming,
      monthlySummary,
      metrics,
      breakdown,
    };

    const headers: HeadersInit | undefined =
      perfTimings && Object.keys(perfTimings).length > 0
        ? {
            "Server-Timing": Object.entries(perfTimings)
              .map(([k, v]) => `${k};dur=${v}`)
              .join(", "),
          }
        : undefined;

    return NextResponse.json(body, headers ? { headers } : undefined);
  } catch (err) {
    if (err instanceof ZodError) {
      return jsonError("Validation error", 422, err.flatten());
    }
    const e = err as Error & { status?: number };
    const status = typeof e.status === "number" ? e.status : 500;
    console.error("[api]", e);
    return jsonError(e.message ?? "Internal error", status);
  }
}
