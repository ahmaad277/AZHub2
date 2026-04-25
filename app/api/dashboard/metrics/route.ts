import { NextRequest } from "next/server";
import { db } from "@/db";
import { platforms } from "@/db/schema";
import { handleRoute, jsonOk } from "@/lib/api";
import { requireOwner } from "@/lib/auth";
import {
  getDashboardMetrics,
  getPlatformBreakdown,
} from "@/lib/finance/metrics";
import { asc } from "drizzle-orm";

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
      const platformRows = await db.select().from(platforms).orderBy(asc(platforms.name));
      const platformMeta = new Map(platformRows.map((platform) => [platform.id, platform]));
      const enrichedBreakdown = await Promise.all(
        breakdown.map(async (row) => {
          const platformMetrics = await getDashboardMetrics({ platformId: row.platformId });
          return {
            ...row,
            platformColor: platformMeta.get(row.platformId)?.color ?? null,
            defaultedCount: platformMetrics.defaultedCount,
          };
        }),
      );
      return { metrics, breakdown: enrichedBreakdown };
    }
    return { metrics };
  });
}
