import { NextRequest } from "next/server";
import { handleRoute } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import { getCachedMonthlyCashflowSummary } from "@/lib/server/dashboard-metrics-cache";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleRoute(async () => {
    await requireOwner();
    const { searchParams } = new URL(request.url);
    const platformId = searchParams.get("platformId");
    const monthlyScope = platformId && platformId !== "all" ? platformId : "all";
    const monthKeyUtc = new Date().toISOString().slice(0, 7);
    return getCachedMonthlyCashflowSummary(monthlyScope, monthKeyUtc);
  });
}
